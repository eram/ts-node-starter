import { strictEqual as equal } from "assert";
import { main } from "./index";

describe("Typescript usage suite", () => {

  it("should be able to execute a test", () => {
    equal(true, true);
  });

  it("main should return 0", () => {
    equal(main(), 0);
  });
  
});