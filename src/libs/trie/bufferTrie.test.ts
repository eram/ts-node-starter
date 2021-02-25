/* eslint-disable sonarjs/no-duplicate-string */
import * as BufTrie from "./bufferTrie";
import { Trie } from "./trie";


describe("BufTrie(undefined) testing", () => {

  const buildTrie = () => {
    const qt = new Trie<undefined>();
    qt.set("foo");
    qt.set("foobar");
    qt.set("bar");
    return qt;
  };

  test("get buffer size", () => {

    const qt = buildTrie();
    expect(qt.has("foo")).toBeTruthy();

    const sz1 = BufTrie.requiredSize(qt);
    expect(sz1).toBeGreaterThan(12);

    qt.set("food");

    const sz2 = BufTrie.requiredSize(qt);
    expect(sz2).toEqual(51);
  });

  test("dump a QuickTrie", () => {

    const qt = new Trie();
    qt.set("foo");

    expect(qt.has("foo")).toBeTruthy();

    const sz1 = BufTrie.requiredSize(qt);
    expect(sz1).toBeGreaterThan(10);

    const buf = Buffer.alloc(sz1);

    const sz2 = BufTrie.dump(qt, buf);
    expect(sz2).toEqual(sz1);
  });

  test("dump fails on buffer too small", () => {
    const qt = buildTrie();
    const sz = BufTrie.dump(qt, Buffer.alloc(10));
    expect(sz).toEqual(0);
  });

  test("dump data", () => {
    const qt = new Trie();
    qt.set("foo");
    const buf = Buffer.alloc(BufTrie.requiredSize(qt));
    const sz = BufTrie.dump(qt, buf);
    expect(sz).not.toEqual(0);

    const expectedJSON = {
      data: [75, 11, 0, 102, 111, 111, 58, 48, 48, 48, 48, 48, 48, 59],
      type: "Buffer",
    };

    expect(buf.toJSON()).toEqual(expectedJSON);
  });


  test("mount on a buffer", () => {

    const qt = new Trie();
    qt.set("foo");
    const buf = Buffer.alloc(BufTrie.requiredSize(qt));
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    expect(kt).toBeInstanceOf(Object);
    expect(kt.stats.size).toEqual(buf.length);

    const empt = kt.has("");
    expect(empt).toBeFalsy();

    const foo = kt.has("foo");
    expect(foo).toBeTruthy();
  });

  test("has", () => {

    const qt = buildTrie();
    const buf = Buffer.alloc(1024);
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    const empt = kt.has("");
    expect(empt).toBeFalsy();

    const barfoo = kt.has("barfoo");
    expect(barfoo).toBeFalsy();

    const foo1 = kt.has("foo");
    expect(foo1).toBeTruthy();

    const foo2 = kt.has("foo");
    expect(foo2).toBeTruthy();

    const foobar = kt.has("foobar");
    expect(foobar).toBeTruthy();

    const foobar2 = kt.has("foobar2");
    expect(foobar2).toBeFalsy();

    expect(kt.stats.hits).toEqual(3);
    expect(kt.stats.miss).toEqual(3);
  });
});


describe("BufTrie(ARRAY) testing", () => {

  const buildTrie = () => {
    const qt = new Trie<string[]>();
    qt.set("foo", ["foo1", "foo2"]);
    qt.set("foobar", ["foobar1", "foobar2"]);
    qt.set("bar", ["bar1", "bar2"]);
    return qt;
  };

  test("get buffer size", () => {

    const qt = buildTrie();
    expect(qt.has("foo")).toBeTruthy();

    const sz1 = BufTrie.requiredSize(qt);
    expect(sz1).toBeGreaterThan(12);

    qt.set("food", []);

    const sz2 = BufTrie.requiredSize(qt);
    expect(sz2).toEqual(150);
  });

  test("dump a QuickTrie", () => {

    const qt = new Trie<string[]>();
    qt.set("foo", ["foo1"]);
    expect(qt.has("foo")).toBeTruthy();

    const sz1 = BufTrie.requiredSize(qt);
    expect(sz1).toBeGreaterThan(10);

    const buf = Buffer.alloc(sz1);

    const sz2 = BufTrie.dump(qt, buf);
    expect(sz2).toEqual(sz1);
  });

  test("dump fails on buffer too small", () => {
    const qt = buildTrie();
    const sz = BufTrie.dump(qt, Buffer.alloc(11));
    expect(sz).toEqual(0);
  });

  test("dump data", () => {
    const qt = new Trie<string[]>();
    qt.set("foo", []);
    const buf = Buffer.alloc(BufTrie.requiredSize(qt));
    const sz = BufTrie.dump(qt, buf);
    expect(sz).not.toEqual(0);

    const expectedJSON = {
      data: [75, 11, 0, 102, 111, 111, 58, 48, 48, 48, 48, 48, 101, 59, 75, 8, 0, 58,
        48, 48, 48, 48, 48, 112, 59, 2, 0, 91, 93],
      type: "Buffer",
    };

    expect(buf.toJSON()).toEqual(expectedJSON);
  });


  test("mount", () => {

    const qt = new Trie<string[]>();
    qt.set("foo", []);
    const buf = Buffer.alloc(BufTrie.requiredSize(qt));
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    expect(kt).toBeInstanceOf(Object);
    expect(kt.stats.size).toEqual(buf.length);

    const empt = kt.has("");
    expect(empt).toBeFalsy();

    const foo = kt.has("foo");
    expect(foo).toBeTruthy();
  });

  test("has", () => {

    const qt = buildTrie();
    const buf = Buffer.alloc(1024);
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    const empt = kt.has("");
    expect(empt).toBeFalsy();

    const barfoo = kt.has("barfoo");
    expect(barfoo).toBeFalsy();

    const foo1 = kt.has("foo", "foo1");
    expect(foo1).toBeTruthy();

    const foo2 = kt.has("foo", "foo2");
    expect(foo2).toBeTruthy();

    const foo3 = kt.has("foo", "foo3");
    expect(foo3).toBeFalsy();

    const foobar = kt.has("foobar");
    expect(foobar).toBeTruthy();

    const foobar2 = kt.has("foobar2");
    expect(foobar2).toBeFalsy();

    expect(kt.stats.hits).toEqual(3);
    expect(kt.stats.miss).toEqual(4);
  });
});


describe("BufTrie(number) testing", () => {

  const buildTrie = () => {
    const qt = new Trie<number>();
    qt.set("foo", 1);
    qt.set("foobar", 2);
    qt.set("bar", 3);
    return qt;
  };

  test("get", () => {

    const qt = buildTrie();
    const buf = Buffer.alloc(1024);
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    const barfoo = kt.get("barfoo");
    expect(barfoo).toBeFalsy();

    const foo1 = kt.get("foo");
    expect(foo1).toEqual(1);
  });

  test("has", () => {

    const qt = buildTrie();
    const buf = Buffer.alloc(1024);
    BufTrie.dump(qt, buf);
    const kt = BufTrie.mount(buf);

    const empt = kt.has("");
    expect(empt).toBeFalsy();

    const barfoo = kt.has("barfoo");
    expect(barfoo).toBeFalsy();

    const foo1 = kt.has("foo", 1);
    expect(foo1).toBeTruthy();

    const foo3 = kt.has("foo", 0);
    expect(foo3).toBeFalsy();

    const foobar = kt.has("foobar");
    expect(foobar).toBeTruthy();

    const foobar2 = kt.has("foobar2");
    expect(foobar2).toBeFalsy();

    expect(kt.stats.hits).toEqual(2);
    expect(kt.stats.miss).toEqual(4);
  });
});
