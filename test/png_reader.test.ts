import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import getZtxt from "../src/png_reader";


test("PngReader extracts and decompresses zTXt chunk", async () => {
  const png = readFile("test/samples/hello-world.png");
  const bytes = (await png).buffer;
  expect(getZtxt(bytes)).toBe("Hello, world!");
});
