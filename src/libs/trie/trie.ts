const trieMapping = require('trie-mapping');  // eslint-disable-line

//
// Trie class is a wrapper around trie-mapping:
// A compact key-value store that is especially efficient when storing large strings.
//

export interface INode<T> extends Record<string, INode<T> | T> { }    // eslint-disable-line

interface ITrie<T> extends Map<string, T> {
  root: INode<T>;
}

export class TrieConfig {
  ignoreCasing = true;
}

export class Trie<T = undefined> {

  readonly ignoreCasing: boolean;

  protected readonly _trie: ITrie<T>;
  protected _hits = 0;
  protected _miss = 0;

  constructor(config: TrieConfig = new TrieConfig()) {
    if (config && config.ignoreCasing !== undefined) {
      this.ignoreCasing = config.ignoreCasing;
    }
    this._trie = trieMapping();
  }

  set(key: string, value: T = undefined) {
    const key1 = this.ignoreCasing ? key.toLowerCase() : key;
    this._trie.set(key1, value);
  }

  get(key: string) {
    const key1 = this.ignoreCasing ? key.toLowerCase() : key;
    const rc = this._trie.get(key1);
    if (rc !== undefined) { this._hits++; } else { this._miss++; }
    return rc;
  }

  has(key: string) {
    const key1 = this.ignoreCasing ? key.toLowerCase() : key;
    const rc = this._trie.has(key1);
    if (rc) { this._hits++; } else { this._miss++; }
    return rc;
  }

  get root() { return this._trie.root; }

  get stats() {
    return {
      size: this._trie.size,
      hits: this._hits,
      miss: this._miss,
    };
  }
}

