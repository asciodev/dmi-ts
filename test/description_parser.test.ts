import { test, expect } from "vitest";
import { parseDmiDescription, stripQuotes, stringToIntList } from '../src/description_parser';

const sample = `# BEGIN DMI
version = 4.0
\twidth = 32
\theight = 32
state = "someone"
\tdirs = 4
\tframes = 1
\# END DMI`;

test("DescriptionParser parses DMI description into blocks", () => {
  const parsed = parseDmiDescription(sample);
  expect(parsed[0].header.key).toBe('version');
  expect(parsed[0].header.value).toBe('4.0');
  expect(parsed[1].children[0].key).toBe('dirs');
  expect(parsed[1].children[1].value).toBe('1');
});

test("stripQuotes strips quotes", () => {
  expect(stripQuotes('"Test quote"')).toBe('Test quote');
})

test("stringToIntList parses a comma-separated list", () => {
  expect(stringToIntList('1,2,5')).toStrictEqual([1,2,5]);
})
