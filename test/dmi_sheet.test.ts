import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createDmiSheet, createPoint, DmiIcon, DmiSheet, DmiState, DmiStateType, IconDirection } from "../src/dmi_sheet"
import { readFile } from "node:fs/promises";
import { Some } from "../src/maybe";
import Image from "image-js";
import { DmiParseError } from "../src/errors";

const _animFile = 'test/samples/anim.dmi';
const _twoStaticFile = 'test/samples/two-static.dmi';
const _leftPngFile = 'test/samples/left.png';
const animBytes = await readFile(_animFile);
const twoStaticBytes = await readFile(_twoStaticFile);
const leftPngBytes = await readFile(_leftPngFile);

test('Point equality checking works', () => {
  expect((createPoint(1, 1)).equals(createPoint(1, 1))).toBeTruthy();
  expect((createPoint(1, 1)).equals(createPoint(1, 0))).toBeFalsy();
  expect((createPoint(1, 1)).equals(createPoint(0, 1))).toBeFalsy();
  expect((createPoint(1, 1)).equals(createPoint(0, 0))).toBeFalsy();
});

describe('Animation states', () => {
  let sheet: DmiSheet;
  let movie: DmiState;

  beforeEach(async () => {
    sheet = await createDmiSheet(animBytes);
    movie = sheet.states[0];
  });

  test('are properly instantiated as MovieState', () => {
    expect(sheet.states[0].type===DmiStateType.Movie).toBeTruthy();
  });

  test('Icon size is correct', () => {
    expect(sheet.iconWidth).toEqual(32);
    expect(sheet.iconHeight).toEqual(32);
  });

  test('have correct number of frames', () => {
    expect(movie.frameCount).toEqual(2);
    movie.icons.forEach((frames, _) => {
      expect(frames.length).toEqual(2);
    });
  });

  test('have the correct number of directions', () => {
    expect(movie.dirCount).toEqual(4);
    expect(movie.icons.size).toEqual(4);
  });

  test('Hotspots are parsed correctly', () => {
    expect(Some(Some(movie.icons.get(IconDirection.south))[0].hotspot).equals(createPoint(0, 0))).toBeTruthy();
    expect(Some(Some(movie.icons.get(IconDirection.north))[0].hotspot).equals(createPoint(31, 31))).toBeTruthy();
  });

  test('report correct number of icons', () => {
    expect(movie.iconCount).toEqual(8);
  });

  test('return correct thumbnail', () => {
    const expectedImage = Some(movie.icons.get(IconDirection.south))[0].image;
    expect(movie.thumbnail.toBuffer()).toEqual(expectedImage.toBuffer());
  });
});

describe('Static icons', () => {
  let sheet: DmiSheet;

  beforeEach(async () => {
    sheet = await createDmiSheet(twoStaticBytes);
  });

  test('Image width is correct', () => {
    expect(sheet.image.width).toEqual(64);

    // Again, to fetch cached
    expect(sheet.image.width).toEqual(64);
  });

  test('Image height is correct', () => {
    expect(sheet.image.height).toEqual(32);
    expect(sheet.image.height).toEqual(32);
  });

  test('Number of rows is reported correctly', () => {
    expect(sheet.rowCount).toEqual(1);
  });

  test('Number of columns is reported correctly', () => {
    expect(sheet.columnCount).toEqual(2);
  });

  test('Coordinates of icons are calculated correctly', () => {
    expect(sheet.getIconCoords(0).equals(createPoint(0, 0))).toBeTruthy();
    expect(sheet.getIconCoords(1).equals(createPoint(32, 0))).toBeTruthy();
  });

  test('Bad indices in getIconCoords() are caught', () => {
    expect(() => sheet.getIconCoords(-1))
    .toThrowError();
    expect(() => sheet.getIconCoords(10))
    .toThrowError();
  });
});

describe('Image processing', () => {
  let leftPng: Image;
  let sheet: DmiSheet;

  beforeEach(async () => {
    leftPng = await Image.load(leftPngBytes);
    sheet = await createDmiSheet(twoStaticBytes);
  });

  test('Icon is properly extracted to separate image', () => {
    const state: DmiState = sheet.getStateNamed('left');
    let icon: DmiIcon;

    if (state.type===DmiStateType.Pixmap) {
      icon = Some(state.icons.get(IconDirection.none))[0];
    } else {
      throw new DmiParseError('Problem fetching state, cannot extract icon');
    }

    expect((icon.image).toBase64()).toEqual(leftPng.toBase64());
  });
});
