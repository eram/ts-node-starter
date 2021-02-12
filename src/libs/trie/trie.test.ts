/* eslint-disable sonarjs/no-duplicate-string */
// eslint-disable-next-line filenames/match-regex
import { Trie } from "./trie";

describe("QuickTrie tests", () => {

  test("get() should retrieve correct nodes by key (number)", () => {
    const qt = new Trie<number>();
    qt.set("foo", 1);
    qt.set("foobar", 2);
    qt.set("bar", 3);

    const foo = qt.get("foo");
    const foobar = qt.get("foobar");
    const bar = qt.get("bar");
    const BAR = qt.get("BAR");
    const barfoo = qt.get("barfoo");

    expect(foo).toEqual(1);
    expect(foobar).toEqual(2);
    expect(bar).toEqual(3);
    expect(BAR).toEqual(3);
    expect(barfoo).toBeUndefined();
  });

  test("get() should retrieve correct nodes by key (string)", () => {
    const qt = new Trie<string>();
    qt.set("foo", "1");
    qt.set("foobar", "2");
    qt.set("bar", "3");

    const foo = qt.get("foo");
    const foobar = qt.get("foobar");
    const bar = qt.get("bar");
    const BAR = qt.get("BAR");
    const barfoo = qt.get("barfoo");

    expect(foo).toEqual("1");
    expect(foobar).toEqual("2");
    expect(bar).toEqual("3");
    expect(BAR).toEqual("3");
    expect(barfoo).toBeUndefined();
  });

  test("get() should retrieve correct nodes by key (boolean)", () => {
    const qt = new Trie<boolean>();
    qt.set("foo", true);
    qt.set("foobar", true);
    qt.set("bar", false);

    const foo = qt.get("foo");
    expect(foo).toEqual(true);

    const foobar = qt.get("foobar");
    expect(foobar).toEqual(true);

    const bar = qt.get("bar");
    expect(bar).toEqual(false);

    const BAR = qt.get("BAR");
    expect(BAR).toEqual(false);

    const barfoo = qt.get("barfoo");
    expect(barfoo).toBeUndefined();

    expect(qt.stats.hits).toEqual(4);
  });

  test("When ignoreCasing is set to false key in wrong casing should match nothing", () => {
    const qt = new Trie<number>({ ignoreCasing: false });

    qt.set("Hello World", 1);
    qt.set("World Best", 2);
    qt.set("Beer", 3);

    const helloworld = qt.get("hello world");
    const worldbest = qt.get("world best");

    expect(helloworld).toBeUndefined();
    expect(worldbest).toBeUndefined();
  });
});
