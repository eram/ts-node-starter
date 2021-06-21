// import * as path from "path";
// import { afs, atTerminate } from "../../utils";
import { init, transpile } from "./tsTranspile";


const baseFolder = "src/libs/tsTranspile/__mocks__";
const mountPoint = "/mp";
const url = (fn: string) => new URL(`http://localhost${mountPoint}/${fn}`);
const files = {
  noImports: "noImports.ts",
  validImports: "validImports.ts",
  invalidImports: "invalidImports.ts",
  transpileError: "transpileError.ts",
  ENOENT: "notFound.ts",
  nonTs: "nonTs.png",
};

const ISTANBUL = "/* istanbul";

describe("tsTranspile functionality", () => {

  const opts = {
    dirs: { baseFolder, mountPoint, cwd: process.cwd() },
  };

  test("transpile file with no-imports should succeed", async () => {
    const ts = init(opts);
    const u = url(files.noImports);
    const str = await transpile(u, ts);

    expect(typeof str).toEqual("string");
    expect(str.startsWith(ISTANBUL)).toBeTruthy();

    // 2nd time to read from cache
    const str2 = await transpile(u, ts);
    expect(str2.startsWith(ISTANBUL)).toBeTruthy();
  });

  test("transpile file with imports should succeed", async () => {
    const ts = init(opts);
    const u = url(files.validImports);
    const str = await transpile(u, ts);

    expect(typeof str).toEqual("string");
    expect(ts.preloadList.length).toEqual(2);
    expect(str.startsWith(ISTANBUL)).toBeTruthy();
  });

  test("transpile file with invalid-imports should throw", async () => {
    const ts = init(opts);
    const u = url(files.invalidImports);

    await expect(
      transpile(u, ts),
    ).rejects.toThrow();
  });

  /** its hard to find code that will not transpile....
  test("transpile failure should throw", async () => {
    const ts = init(opts);
    const src = path.join(process.cwd(), baseFolder, `${files.transpileError}.txt`);
    const dst = path.join(process.cwd(), baseFolder, files.transpileError);
    atTerminate(async () => { if (await afs.exists(dst)) await afs.unlink(dst); });
    if (await afs.exists(dst)) await afs.unlink(dst);
    await afs.copyFile(src, dst);
    const u = url(files.transpileError);

    await expect(
      transpile(u, ts),
    ).rejects.toThrow();

    await afs.unlink(dst);
  });
  ** */

  test("transpile non-existing file should throw ENOENT error", async () => {
    const ts = init(opts);
    const u = url(files.ENOENT);

    await expect(
      transpile(u, ts),
    ).rejects.toThrow(/ENOENT/);
  });

});
