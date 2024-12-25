import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import getZtxt from "../src/png_reader";


test("PngReader extracts and decompresses zTXt chunk", async () => {
  const bytes = await readFile("test/samples/hello-world.png");
  expect(getZtxt(bytes)).toBe("Hello, world!");
});
