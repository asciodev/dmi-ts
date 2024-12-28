import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DmiIcon, DmiSheet, DmiState, IconDirection, MovieState, PixmapState, Point } from "../src/dmi_sheet"
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
  expect((new Point(1, 1)).equals(new Point(1, 1))).toBeTruthy();
  expect((new Point(1, 1)).equals(new Point(1, 0))).toBeFalsy();
  expect((new Point(1, 1)).equals(new Point(0, 1))).toBeFalsy();
  expect((new Point(1, 1)).equals(new Point(0, 0))).toBeFalsy();
});

describe('Animation states', () => {
  let sheet: DmiSheet;
  let movie: DmiState;

  beforeEach(async () => {
    sheet = await DmiSheet.fromBytes(animBytes);
    movie = sheet.states[0];
  });

  test('are properly instantiated as MovieState', () => {
    expect(sheet._states[0] instanceof MovieState).toBeTruthy();
  });

  test('Icon size is correct', () => {
    expect(sheet.iconWidth).toEqual(32);
    expect(sheet.iconHeight).toEqual(32);
  });

  test('have correct number of frames', () => {
    expect((movie as MovieState).framesCount).toEqual(2);
    (movie as MovieState).icons.forEach((frames, _) => {
      expect(frames.length).toEqual(2);
    });
  });

  test('have the correct number of directions', () => {
    expect((movie as MovieState).directionsCount).toEqual(4);
    expect((movie as MovieState).icons.size).toEqual(4);
  });

  test('Hotspots are parsed correctly', () => {
    expect(Some((movie as MovieState).icons.get(IconDirection.south))[0].hotspot).toEqual(new Point(0, 0));
    expect(Some((movie as MovieState).icons.get(IconDirection.north))[0].hotspot).toEqual(new Point(31, 31));
  });

  test('report correct number of icons', () => {
    expect((movie as MovieState).getIconCount()).toEqual(8);
  });

  test('return correct thumbnail', () => {
    const expectedImage = Some((movie as MovieState).icons.get(IconDirection.south))[0].loadImage();
    expect(movie.getThumbnail().toBuffer()).toEqual(expectedImage.toBuffer());
  });
});

describe('Static icons', () => {
  let sheet: DmiSheet;

  beforeEach(async () => {
    sheet = await DmiSheet.fromBytes(twoStaticBytes);
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
    expect(sheet.getRowCount()).toEqual(1);
  });

  test('Number of columns is reported correctly', () => {
    expect(sheet.getColumnCount()).toEqual(2);
  });

  test('Coordinates of icons are calculated correctly', () => {
    expect(sheet.getIconCoords(0)).toEqual(new Point(0, 0));
    expect(sheet.getIconCoords(1)).toEqual(new Point(32, 0));
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
    sheet = await DmiSheet.fromBytes(twoStaticBytes);
  });

  test('Icon is properly extracted to separate image', () => {
    const state: DmiState = sheet.getStateNamed('left');
    let icon: DmiIcon;

    if (state instanceof PixmapState) {
      icon = state.icon;
    } else {
      throw new DmiParseError('Problem fetching state, cannot extract icon');
    }

    expect((icon.loadImage()).toBase64()).toEqual(leftPng.toBase64());
  });
});
