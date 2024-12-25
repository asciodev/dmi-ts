import { afterEach, beforeEach, describe, expect, onTestFailed, test } from "vitest";
import { DmiIcon, DmiSheet, DmiState, DmiStateType, IconDirection, MovieState, PixmapState, Point } from "../src/dmi_sheet"
import { readFile } from "node:fs/promises";
import { Some } from "../src/maybe";
import Image from "image-js";
import { DmiParseError } from "../src/errors";

const _animFile = 'test/samples/anim.dmi';
const _twoStaticFile = 'test/samples/two-static.dmi';
const _leftPngFile = 'test/samples/left.png';
const animBytes = await readFile(_animFile);
const twoStaticBytes = await readFile(_twoStaticFile);
const _leftPngBytes = await readFile(_leftPngFile);

test('Point equality checking works', () => {
  expect((new Point(1, 1)).equals(new Point(1, 1))).toBeTruthy();
  expect((new Point(1, 1)).equals(new Point(1, 0))).toBeFalsy();
  expect((new Point(1, 1)).equals(new Point(0, 1))).toBeFalsy();
  expect((new Point(1, 1)).equals(new Point(0, 0))).toBeFalsy();
});

describe('Animation states', () => {
  let sheet: DmiSheet;
  let anim: MovieState;

  beforeEach(async () => {
    sheet = await DmiSheet.fromBytes(animBytes);
    anim = sheet.states[0] as MovieState;
  });

  test('are properly instantiated as MovieState', () => {
    expect(sheet._states[0] instanceof MovieState).toBeTruthy();
  });

  test('Icon size is correct', () => {
    expect(sheet.iconWidth).toEqual(32);
    expect(sheet.iconHeight).toEqual(32);
  });

  test('have correct number of frames', () => {
    expect(anim.framesCount).toEqual(2);
    anim.icons.forEach((frames, _) => {
      expect(frames.length).toEqual(2);
    });
  });

  test('have the correct number of directions', () => {
    expect(anim.directionsCount).toEqual(4);
    expect(anim.icons.size).toEqual(4);
  });

  test('Hotspots are parsed correctly', () => {
    expect(Some(anim.icons.get(IconDirection.south))[0].hotspot).toEqual(new Point(0, 0));
    expect(Some(anim.icons.get(IconDirection.north))[0].hotspot).toEqual(new Point(31, 31));
  });

  test('report correct number of icons', async () => {
    expect(await MovieState.getIconCount(anim)).toEqual(8);
  });

  test('return correct thumbnail', async () => {
    const expectedImage = await DmiIcon.loadImage(Some(anim.icons.get(IconDirection.south))[0]);
    expect((await MovieState.getThumbnail(anim)).toBuffer()).toEqual(expectedImage.toBuffer());
  });
});

describe('Static icons', () => {
  let sheet: DmiSheet;

  beforeEach(async () => {
    sheet = await DmiSheet.fromBytes(twoStaticBytes);
  });

  test('Image width is correct', async () => {
    expect(await DmiSheet.getImageWidth(sheet)).toEqual(64);

    // Again, to fetch cached
    expect(await DmiSheet.getImageWidth(sheet)).toEqual(64);
  });

  test('Image height is correct', async () => {
    expect(await DmiSheet.getImageHeight(sheet)).toEqual(32);
    expect(await DmiSheet.getImageHeight(sheet)).toEqual(32);
  });

  test('Number of rows is reported correctly', async () => {
    expect(await DmiSheet.getRowCount(sheet)).toEqual(1);
  });

  test('Number of columns is reported correctly', async () => {
    expect(await DmiSheet.getColumnCount(sheet)).toEqual(2);
  });

  test('Coordinates of icons are calculated correctly', async () => {
    expect(await DmiSheet.getIconCoords(sheet, 0)).toEqual(new Point(0, 0));
    expect(await DmiSheet.getIconCoords(sheet, 1)).toEqual(new Point(32, 0));
  });

  test('Bad indices in getIconCoords() are caught', () => {
    expect(
      DmiSheet.getIconCoords(sheet, -1)
    )
    .rejects
    .toThrowError();
    expect(DmiSheet.getIconCoords(sheet, 10)).rejects.toThrowError();
  });
});

describe('Image processing', () => {
  let leftPng: Image;
  let sheet: DmiSheet;

  beforeEach(async () => {
    leftPng = await Image.load(_leftPngBytes);
    sheet = await DmiSheet.fromBytes(twoStaticBytes);
  });

  test('Icon is properly extracted to separate image', async () => {
    const state: DmiState = sheet.getStateNamed('left');
    let icon: DmiIcon;

    if (state instanceof PixmapState) {
      icon = state.icon;
    } else {
      throw new DmiParseError('Problem fetching state, cannot extract icon');
    }

    expect((await DmiIcon.loadImage(icon)).toBase64()).toEqual(leftPng.toBase64());
  });
});
