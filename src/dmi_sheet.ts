import { parseDmiDescription, stripQuotes, Block, stringToIntList } from "./description_parser";
import { Dictionary, NumericDictionary } from "./dictionary";
import { ArgumentError, DescriptionParseError, DmiParseError } from "./errors";
import { Maybe, Some } from "./maybe";
import { Image } from 'image-js';
import getZtxt from "./png_reader";

export interface DmiSheet {
  iconWidth: number;
  iconHeight: number;
  imageWidth: number;
  imageHeight: number;
  image: Image;
  columnCount: number;
  rowCount: number;
  states: DmiState[];
  getIconCoords: (idx: number) => Point;
  getStateNamed: (name: string) => DmiState
}

export async function createDmiSheet(bytes: Uint8Array) {
  /// Width of each icon in the sheet
  let iconWidth: number = 0;

  /// Height of each icon in the sheet
  let iconHeight: number = 0;

  /// Height of the whole sprite sheet
  let imageHeight: number = 0;

  /// Width of the whole sprite sheet
  let imageWidth: number = 0;

  /// The spritesheet
  let image = await(Image.load(bytes));

  /// Number of icons horizontally in one row of the sprite sheet
  const getColumnCount = () => { return Math.floor(image.width / iconWidth); }

  /// Number of icons vertically in one column of the sprite sheet
  const getRowCount = () => { return Math.floor(image.height / iconHeight); }

  /// Icon states defined for this dmi sheet
  const states = () => {
    return _states;
  }

  const _states: DmiState[] = [];
  const _statesByName: Dictionary<DmiState> = {};

  /// Return state with the given name or `null` if not present
  const getStateNamed = (name: string) => { return _statesByName[name]; }

  /// Get the coordinates for the upper left of an icon in the spritesheet
  ///
  /// `index` starts at 0 and advances row first. Note that this function will
  /// **not** throw a [RangeError] if the last row isn't full and it's asked
  /// coordinates for an icon that would have been there, had the row been full.
  /// It will throw a [RangeError] for indices that couldn't possibly be on the
  /// sheet.
  const getIconCoords = (index: number) => {
    if (index < 0) {
      throw new RangeError('Icon index cannot be less than 0');
    }

    var row = Math.floor(index / (getColumnCount()));

    if (row > (getRowCount())) {
      throw new RangeError('Index $index is outside of sheet');
    }
    let col = index % (getColumnCount());

    return createPoint((col * iconWidth), (row * iconHeight));
  }

  const blocks: Block[] = parseDmiDescription(Some(getZtxt(bytes)));

  // The first block contains info about the whole sheet, so we parse it
  // separately. It always starts with a 'version' header.
  const firstBlock: Block = Some(blocks.shift());
  if (firstBlock.header.key != 'version') {
    throw new DescriptionParseError(
        'Description does not open with a version header (opened with $firstBlock.header)');
  }

  // We assume that we're incompatible with other versions, although who knows
  // if the version number is a useful indicator of anything
  const majorVersionRegExp = new RegExp(/(\d+).(\d+)/);
  const majorVersionMatches = Some(majorVersionRegExp.exec(firstBlock.header.value) as Maybe<RegExpExecArray>);
  const majorVersion: number = Number.parseInt(majorVersionMatches[1]);

  if (majorVersion != 4) {
    throw new DmiParseError('Incompatible major dmi version');
  }

  for (var statement of firstBlock.children) {
    if (statement.key == 'width') {
      iconWidth = Number.parseInt(statement.value);
    } else if (statement.key == 'height') {
      iconHeight = Number.parseInt(statement.value);
    }
  }

  // We could default to 32×32, but it seems like descriptions always specify
  // dimensions, so we consider otherwise to be an error.
  if (iconWidth == null || iconHeight == null) {
    throw new DmiParseError('Description does not specify icon dimensions');
  }

  var iconCount = 0;

  const sheet: DmiSheet = {
    iconWidth, iconHeight, imageWidth, imageHeight, getIconCoords,
    image,
    columnCount: getColumnCount(),
    rowCount: getRowCount(),
    states: _states,
    getStateNamed
  }
  for (var block of blocks) {
    var state = createDmiState(block, sheet, iconCount);
    iconCount += state.iconCount;
    _states.push(state);
    _statesByName[state.name] = state;
  }
  Object.freeze(_states);
  return sheet;
}

export enum DmiStateType {
  Pixmap,
  Movie
}

export interface DmiState {
  name: string;
  icons: Map<IconDirection, DmiIcon[]>;
  movement: boolean;
  sheet: DmiSheet;
  thumbnail: Image;
  frameCount: number;
  dirCount: number;
  delays: number[];
  iconCount: number
  type: DmiStateType;
}

/// An object representing a Dmi sheet state
///
/// Entries in a Dmi sheet (called 'states' in BYOND) can be either 'pixmaps',
/// in which case [PixmapState] should be used, or 'movies', in which case
/// [MovieState] should be used.
export function createDmiState(block: Block, sheet: DmiSheet, iconCount: number): DmiState {
  /// name: State name, the string which is used to refer to the state in DM code
  const name = stripQuotes(block.header.value);

  /// Parse a description [Block] describing a state and instantiate that state
  ///
  /// [iconCount] is used to determine the index offset for the new icons
  let dirCount = -1;
  let frameCount = -1;
  let delays: number[] = [];
  let movement = false;
  const hotspots: NumericDictionary<Point> = {}; // frame number to x,y

  if (block.header.key !== 'state') {
    throw new DmiParseError('Invalid state header $block.header');
  }

  for (var child of block.children) {
    if (child.key == 'dirs') {
      dirCount = Number(child.value);
    } else if (child.key == 'frames') {
      frameCount = Number.parseInt(child.value);
    } else if (child.key == 'movement') {
      movement = child.value == '1';
    } else if (child.key == 'delay') {
      delays = stringToIntList(child.value);
    } else if (child.key == 'hotspot') {
      // hotspots are specified as [x,y,index]
      var hotspot = stringToIntList(child.value);
      hotspots[hotspot[2]] = createPoint(hotspot[0], hotspot[1]);
    }
    // We silently ignore entries we don't recognize
  }

  if (!dirCount || !frameCount || !name ) {
    throw new DmiParseError('Incomplete specification for $block.header');
  }

  if (dirCount * frameCount == 1) {
    const icons = new Map<IconDirection, DmiIcon[]>();
    const icon = [createDmiIcon(sheet, iconCount, hotspots[1])];
    icons.set(IconDirection.none, icon);
    const thumbnail = icon[0].image;
    return {name, icons, movement, sheet, thumbnail, frameCount, dirCount, delays, iconCount: 1, type: DmiStateType.Pixmap}
  } else {
    let availableDirs: IconDirection[];
    if (dirCount == 1) {
      availableDirs = [IconDirection.none];
    } else {
      availableDirs = (Object.values(IconDirection) as IconDirection[]).slice(1, dirCount + 1);
    }

    // For each of dirCount directions, make a list of icons of length frameCount
    const icons: Map<IconDirection, DmiIcon[]> = new Map();
    availableDirs.forEach((dir) => {
      const _emptyFrames = new Array(frameCount);
      _emptyFrames.fill(undefined);
      Object.seal(_emptyFrames);
      icons.set(dir, _emptyFrames);
    });

    // Images are stored direction first. For a movie like this:
    //  Frame: 1 2
    //  North: a b
    //  South: c d
    //
    // The sheet would be arranged in this order: a c b d
    var hotspotIndex = 1;
    var globalIndex = iconCount;

    for (var frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      for (var dir of availableDirs) {
        Some(icons.get(dir))[frameIndex] =
            createDmiIcon(sheet, globalIndex, hotspots[hotspotIndex]);

        globalIndex++;
        hotspotIndex++;
      }
    }

    // dmi files will happily include any number of items in the delays list,
    // but the meaningful values are only the 0 to frameCount-1, so for the sake
    // of sanity we discard the extra information
    if(!!delays.length) {
      delays = delays.slice(0, frameCount);
    }

    const thumbnail = Some(Some(icons.entries().next().value)[1])[0].image;
    return {name, icons, movement, sheet, thumbnail, frameCount, dirCount, delays, iconCount: frameCount * dirCount, type: DmiStateType.Movie}
  }
}

/// Possible directions for movie states
///
/// `none` is used for single direction icons. Remaining directions are in the
/// order they are saved in.
export enum IconDirection {
  none = "none",
  south = "south",
  north = "north",
  east = "east",
  west = "west",
  southeast = "southeast",
  southwest = "southwest",
  northeast = "northeast",
  northwest = "northwest",
}

export interface DmiIcon {
  sheet: DmiSheet;
  index: number;
  hotspot: Maybe<Point>;
  sheetPosition: Point;
  image: Image;
}

/// A single icon in a Dmi sheet
///
/// The description format optionally specifies hotspot coordinates with
/// reference to the upper left corner of the whole sheet. These are provided
/// via [hotspot], which will be `null` if they were not specified.
/// index: Index of this icon within the sheet
/// hotspot: Hotspot global coordinates (with reference to the upper left corner of the
/// icon
export function createDmiIcon(sheet: DmiSheet, index: number, hotspot?: Maybe<Point>): DmiIcon {
  
  /// Coordinates for this icon in the sprite sheet
  ///
  /// Coordinates are the upper left corner pixel of the icon, 0-indexed, with
  /// the origin in the upper left of the sheet and all numbers positve.
  const sheetPosition = sheet.getIconCoords(index);

  const image: Image = sheet.image.crop({
    x: sheetPosition.x,
    y: sheetPosition.y,
    width: sheet.iconWidth,
    height: sheet.iconHeight
  })

  return {sheet, index, hotspot, sheetPosition, image};

}

export interface Point {
  x: number;
  y: number;
  hashcode: number;
  toString: () => string;
  equals: (point: Point) => boolean;
}

/// A generic (x,y) point
export function createPoint(x: number, y: number): Point {
  const equals = (point: Point): point is Point => {
    return point.x === x && point.y === y;
  }

  // http://stackoverflow.com/a/113600/333814

  var result = 503;
  result = 37 * result + x;
  const hashcode = 37 * result + y;

  const toString = () => { return '$x,$y'; }
  return {x, y, hashcode, equals};
}
