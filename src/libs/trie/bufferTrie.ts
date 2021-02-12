import { info, error, assert } from "../../utils";
import { INode, Trie } from "./trie";

//
// Trie class: a key-value store taht can be "dumped" into a buffer (and then into a file) and
// read from buffer (mapped to a file) in sections. "Mounting" a store is done by reading only
// the root node. Then nodes that are needed are read from the buffer and cached in memory.
// This makes it perfect to for usage with large stores where JSON-parse would take a long time
// and block the main thread.
//

const { hasOwnProperty, getOwnPropertyNames, entries } = Object;    // eslint-disable-line

type Offset = number;
const MAGIC = "K".charCodeAt(0);

function isEmptyNode<T>(node: INode<T>): boolean {
  return ("" in node) && node[""] === undefined && getOwnPropertyNames(node).length === 1;
}

export function mount<T>(buffer: Buffer) {

  class BufNode {

    constructor(nodeOffset: Offset) {
      assert(buffer[nodeOffset + 0] === MAGIC);
      const strLen = buffer.readUInt16LE(nodeOffset + 1);
      const str = buffer.toString("utf8", nodeOffset + 3, nodeOffset + 3 + strLen); // !!this is faster than buffer.slice().toString()

      str.split(";").forEach(child => {
        if (child) {
          const kv = child.split(":");
          const offset = parseInt(kv[1], 32);
          if (kv[0] === "" && offset) {
            // the offset points to a length and then a string that holds a json object to parse as T
            const leafLen = buffer.readUInt16LE(offset);
            const leafStr = buffer.toString("utf8", offset + 2, offset + 2 + leafLen);
            const leaf: T = JSON.parse(leafStr);
            (this as any)[''] = leaf;                               // eslint-disable-line
          } else {
            (this as any)[kv[0]] = parseInt(kv[1], 32);             // eslint-disable-line
          }
        }
      }, this);
    }

    get isLeaf(): boolean { return ("" in this); }
    get leaf(): T { return (this as any)['']; }                     // eslint-disable-line
    has(key: string): boolean { return (key in this); }
    get(key: string): BufNode | T {
      let child = (this as any)[key] as number | BufNode | T;         // eslint-disable-line
      if (typeof child === "number") {
        // create a new node and replace child
        child = (child === 0) ? emptyNode : new BufNode(child);       // eslint-disable-line
        (this as any)[key] = child;                                 // eslint-disable-line
      }

      // child is already a node / leaf
      return child;
    }

    findSuffix(suffix: string) {

      ///NB!
      // I'm keeping here a few implementations of this function that I have profiled.
      // The last one is the fastest - - originates from mapping-trie library

      // #1
      //const keys = Object.getOwnPropertyNames(this);
      //return keys.find((prop) => (prop && suffix.startsWith(prop)));

      // #2
      //for (const key in this){
      //  if (key && suffix.startsWith(key)) return key;
      //}
      //return undefined;

      // #3
      //const keys = Object.getOwnPropertyNames(this);
      //for (let i=1; i <= suffix.length; i++){
      //  const sub = suffix.substr(0, i);
      //  if (keys.includes(sub)) return sub;
      //}
      //return undefined;

      // #4
      //for (let i=1; i <= suffix.length; i++){
      //  const sub = suffix.substr(0, i);
      //  if (sub in this) return sub;
      //}
      //return undefined;

      // #5
      const { length } = suffix;
      let end = 1;
      while (end <= length) {
        const sub = suffix.substring(0, end);
        if (hasOwnProperty.call(this, sub)) {
          return sub;
        }
        end += 1;
      }
      return undefined;
    }
  }


  class BufTrie {

    private readonly _root: BufNode;

    private readonly _stats = {
      size: 0,
      hits: 0,
      miss: 0,
    };

    constructor(size: number) {
      this._root = new BufNode(0);
      this._stats.size = size;
    }

    get(key: string): T {
      const rc = this._get(key);
      if (rc !== undefined) {
        this._stats.hits++;
        return rc.leaf;
      } else {
        this._stats.miss++;
        return undefined;
      }
    }

    has(key: string, val?: unknown): boolean {

      const node = this._get(key);
      let rc = (node && node.isLeaf);

      if (rc && val !== undefined) {
        const leaf = node.leaf as unknown as T[];
        if (typeof leaf.includes === "function") {
          rc = (leaf.includes(val as T));
        } else {
          rc = (leaf === val);
        }
      }

      if (rc) { this._stats.hits++; } else { this._stats.miss++; }
      return rc;
    }

    get stats() {
      return this._stats;
    }

    private _get(key: string): BufNode {
      let node = this._root;
      let suffix = key;
      let sub: string;

      while (suffix.length > 0
        && (sub = node.findSuffix(suffix))) {
        node = node.get(sub) as BufNode;
        suffix = suffix.substring(sub.length);
      }
      return (suffix.length === 0) ? node : undefined;
    }

  }

  const emptyNode: BufNode = Object.setPrototypeOf({ "": 0 }, BufNode.prototype);

  // mount a trie on buffer. returns the new KTrie object
  return new BufTrie(buffer.byteLength) as Readonly<BufTrie>;
}


export function requiredSize<T>(trie: Readonly<Trie<T>>) {

  let rc = 0;
  let objects = 0;

  function requiredSize_(node: Readonly<INode<T>>) {

    if (isEmptyNode(node)) return 0;

    objects++;
    let size = 3;                             // base: magic + strLen
    for (const key in node) {
      if (key !== "") {
        const childNode = node[key] as Readonly<INode<T>>;
        size += 2 + key.length + 6;           // 'key:offset;'
        size += requiredSize_(childNode);
      } else {
        // leaf
        const val = node[key] as T;
        if (val === undefined) {
          size += 3;                          // empty leaf: ':0;'
        } else {
          size += 8;                          // ':offset;'
          const leafStr = JSON.stringify(val);
          size += 2 + leafStr.length;
        }
      }
    }

    return size;
  }

  try {
    rc = requiredSize_(trie.root);
    info(`BufTrie: objects=${objects} size=${Math.ceil(rc / 1024)} KB`);
  } catch (err) {
    error("BufTrie requiredSize", err.stack | err);
  }
  return rc;
}



export function dump<T>(trie: Readonly<Trie<T>>, buffer: Buffer) {

  function dump_(node: INode<T>, nodeOffset: number): number {

    const childArr = entries(node);

    // calc the size of the keys string
    let strLen = 0;
    childArr.forEach((child) => {
      const key = child[0];
      if (key !== "") {
        strLen += key.length + 8;               // 'key:offset;'
      } else {
        // leaf
        const val = child[1];
        strLen += (val === undefined) ? 3 : 8;  // empty leaf: ':0;' or ':offset;'
      }
    });

    // add children recursively
    let offset = nodeOffset + 3 + strLen;
    let str = "";
    childArr.forEach((child) => {
      const key = child[0];
      if (key !== "") {
        const childNode = child[1] as INode<T>;
        if (isEmptyNode(childNode)) {
          str += `${key}:000000;`;
        } else {
          str += `${key}:${offset.toString(32).padStart(6, "0")};`;
          offset = dump_(childNode, offset);
        }
      } else {
        // leaf
        const val = child[1];
        if (val === undefined) {
          str += ":0;";
        } else {
          str += `:${offset.toString(32).padStart(6, "0")};`;
          const leafStr = JSON.stringify(val);
          buffer.writeUInt16LE(leafStr.length, offset);
          offset += 2 + buffer.write(leafStr, offset + 2);
        }
      }
    });

    assert(str.length === strLen);
    buffer[nodeOffset] = MAGIC;
    buffer.writeUInt16LE(strLen, nodeOffset + 1);
    buffer.write(str, nodeOffset + 3);
    return offset;
  } // dump_

  try {
    return dump_(trie.root, 0);
  } catch (err) {
    error("dump", err.stack | err);
    return 0;
  }
}