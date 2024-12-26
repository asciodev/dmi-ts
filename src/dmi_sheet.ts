import { parseDmiDescription, stripQuotes, Block, stringToIntList } from "./description_parser";
import { Dictionary, NumericDictionary } from "./dictionary";
import { ArgumentError, DescriptionParseError, DmiParseError } from "./errors";
import { Maybe, Some } from "./maybe";
import { Image } from 'image-js';
import getZtxt from "./png_reader";

export class DmiSheet {
  _bytes: Maybe<Uint8Array>;

  /// Width of each icon in the sheet
  iconWidth: Maybe<number>;

  /// Height of each icon in the sheet
  iconHeight: Maybe<number>;

  _imageHeight: Maybe<number>;
  _imageWidth: Maybe<number>;

  /// Height of the whole sprite sheet
  static async getImageHeight(sheet: DmiSheet) { return sheet._imageHeight ?? (sheet._imageHeight = (await DmiSheet.loadImage(sheet)).height); }

  /// Width of the whole sprite sheet
  static async getImageWidth(sheet: DmiSheet) { return sheet._imageWidth ?? (sheet._imageWidth = (await DmiSheet.loadImage(sheet)).width); }

  _image: Maybe<Image>;

  /// Whole sprite sheet as image
  ///
  /// Images are lazily evaluated. Although the sheet object expects the whole
  /// image to be loaded into memory, it does not actually process the image
  /// as a PNG until it is necessary to do so
  static async loadImage(sheet: DmiSheet) {
    if (sheet._image == null) {
      sheet._image = await Image.load(Some(sheet._bytes))
      sheet._bytes = undefined;
    }

    return Some(sheet._image);
  }

  /// Number of icons horizontally in one row of the sprite sheet
  static async getColumnCount(sheet: DmiSheet) { return Math.floor((await DmiSheet.getImageWidth(sheet)) / Some(sheet.iconWidth)); }

  /// Number of icons vertically in one column of the sprite sheet
  static async getRowCount(sheet: DmiSheet) { return Math.floor((await DmiSheet.getImageHeight(sheet)) / Some(sheet.iconHeight)); }

  /// Icon states defined for this dmi sheet
  get states(): DmiState[] {
      const _frozenStates = structuredClone(this._states);
      Object.freeze(_frozenStates);
      return _frozenStates;
  }

  _states: DmiState[] = [];
  _statesByName: Dictionary<DmiState> = {};

  /// Return state with the given name or `null` if not present
  getStateNamed(name: string) { return this._statesByName[name]; }

  /// Get the coordinates for the upper left of an icon in the spritesheet
  ///
  /// `index` starts at 0 and advances row first. Note that this function will
  /// **not** throw a [RangeError] if the last row isn't full and it's asked
  /// coordinates for an icon that would have been there, had the row been full.
  /// It will throw a [RangeError] for indices that couldn't possibly be on the
  /// sheet.
  static async getIconCoords(sheet: DmiSheet, index: number) {
    if (index < 0) {
      throw new RangeError('Icon index cannot be less than 0');
    }

    var row = Math.floor(index / (await DmiSheet.getColumnCount(sheet)));

    if (row > (await DmiSheet.getRowCount(sheet))) {
      throw new RangeError('Index $index is outside of sheet');
    }
    let col = index % (await DmiSheet.getColumnCount(sheet));

    return new Point((col * Some(sheet.iconWidth)), (row * Some(sheet.iconHeight)));
  }

  /// Load from a dmi file loaded into a list of bytes
  static async fromBytes(bytes: Uint8Array) {
    const sheet = new DmiSheet();
    sheet._bytes = bytes;

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
    let iconWidth: Maybe<number>;
    let iconHeight: Maybe<number>;

    if (majorVersion != 4) {
      throw new DmiParseError('Incompatible major dmi version');
    }

    for (var statement of firstBlock.children) {
      if (statement.key == 'width') {
        sheet.iconWidth = Number.parseInt(statement.value);
      } else if (statement.key == 'height') {
        sheet.iconHeight = Number.parseInt(statement.value);
      }
    }

    // We could default to 32×32, but it seems like descriptions always specify
    // dimensions, so we consider otherwise to be an error.
    if (sheet.iconWidth == null || sheet.iconHeight == null) {
      throw new DmiParseError('Description does not specify icon dimensions');
    }

    var iconCount = 0;

    for (var block of blocks) {
      var state = DmiState._fromBlock(block, sheet, iconCount);
      let count;
      if(state.name === "anim") count = await MovieState.getIconCount(state as MovieState);
      else count = await PixmapState.getIconCount(state as PixmapState);
      iconCount += await count;
      sheet._states.push(state);
      sheet._statesByName[state.name] = state;
    }
    
    return sheet;
  }
}

export enum DmiStateType {
  Pixmap,
  Movie
}

/// An object representing a Dmi sheet state
///
/// Entries in a Dmi sheet (called 'states' in BYOND) can be either 'pixmaps',
/// in which case [PixmapState] should be used, or 'movies', in which case
/// [MovieState] should be used.
export abstract class DmiState {
  /// name: State name, the string which is used to refer to the state in DM code
  constructor(public name: string, public movement: boolean, public dmiStateType: DmiStateType) {}

  /// Total number of icons in the state
  static async getIconCount(_: DmiState): Promise<number> { 
    throw new ArgumentError("getIconCount called on abstract DmiState")
  };

  /// Convenience function for getting a representative icon for this state
  static async getThumbnail(_: DmiState): Promise<Image> {
    throw new ArgumentError("getThumbnail called on abstract DmiState")
  };

  /// Parse a description [Block] describing a state and instantiate that state
  ///
  /// [iconCount] is used to determine the index offset for the new icons
  static _fromBlock = (block: Block, sheet: DmiSheet, iconCount: number) => {
    let dirCount: Maybe<number>;
    let frameCount: Maybe<number>;
    let name: string;
    let delays: Maybe<number[]>;
    let movement = false;
    const hotspots: NumericDictionary<Point> = {}; // frame number to x,y

    if (block.header.key !== 'state') {
      throw new DmiParseError('Invalid state header $block.header');
    }

    name = stripQuotes(block.header.value);

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
        hotspots[hotspot[2]] = new Point(hotspot[0], hotspot[1]);
      }
      // We silently ignore entries we don't recognize
    }

    if (dirCount == null || frameCount == null || name == null) {
      throw new DmiParseError('Incomplete specification for $block.header');
    }

    if (dirCount * frameCount == 1) {
      return new PixmapState(name, new DmiIcon(sheet, iconCount, hotspots[1]), movement);
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
              new DmiIcon(sheet, globalIndex, hotspots[hotspotIndex]);

          globalIndex++;
          hotspotIndex++;
        }
      }

      // dmi files will happily include any number of items in the delays list,
      // but the meaningful values are only the 0 to frameCount-1, so for the sake
      // of sanity we discard the extra information
      if(delays != null) {
        delays = delays.slice(0, frameCount);
      }

      return new MovieState(
        name,
        icons,
        delays,
        frameCount,
        dirCount,
        movement,
      );
    }
  }
}

/// A pixmap Dmi state
///
/// This is a state representing a single image only.
export class PixmapState extends DmiState {
  constructor(name: string, public icon: DmiIcon, movement: boolean = false) { super(name, movement, DmiStateType.Pixmap)}

  static async getIconCount(_: PixmapState) { return 1; }; // Pixmap is always one icon

  static async getThumbnail(state: PixmapState) { return await DmiIcon.loadImage(state.icon) };
}

/// A movie Dmi state
///
/// This state can consist of a number of animations, each with the same number
/// of frames and the same delay between each frame.
///
/// A movie can contain a single animation, or a number of animations
/// corresponding to different facing directions of the object. The number of
/// directions will either be 4 (cardinal directions) or 8 (cardinal directions
/// and diagonals).
export class MovieState extends DmiState {
  /// icons: List mapping directions to lists of animation frames
  /// delays: Animation delays for each frame of the animation.
  ///
  /// These delays are the same for every direction. The list will always have
  /// as many items as [framesCount], even if the delays list defined in the dmi
  /// itself is longer.
  constructor(name: string, public icons: Map<IconDirection, DmiIcon[]>, public delays?: number[],
    public framesCount = 1, public directionsCount = 1, movement = false) { super(name, movement, DmiStateType.Movie) }

  static async getIconCount(state: MovieState): Promise<number> {
    return state.framesCount * state.directionsCount;
  }

  /// Get first icon in first direction, for use as thumbnail
  static async getThumbnail(state: MovieState): Promise<Image> { 
    return await DmiIcon.loadImage(Some(Some(state.icons.entries().next().value)[1])[0]);
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

/// A single icon in a Dmi sheet
///
/// The description format optionally specifies hotspot coordinates with
/// reference to the upper left corner of the whole sheet. These are provided
/// via [hotspot], which will be `null` if they were not specified.
/// index: Index of this icon within the sheet
/// hotspot: Hotspot global coordinates (with reference to the upper left corner of the
/// icon
export class DmiIcon {
  /// Create an image, optionally specifying a hotspot
  ///
  /// [_sheet] is the sheet in which this icon can be found, [_index] is the
  /// index of the icon within the sheet
  constructor(public _sheet: DmiSheet, public _index: number, public hotspot: Maybe<Point> = undefined ) {}

  _image: Maybe<Image>;


  /// Coordinates for this icon in the sprite sheet
  ///
  /// Coordinates are the upper left corner pixel of the icon, 0-indexed, with
  /// the origin in the upper left of the sheet and all numbers positve.
  static async getSheetPosition(icon: DmiIcon) { return await DmiSheet.getIconCoords(icon._sheet, icon._index); }

  static async loadImage(icon: DmiIcon): Promise<Image> {
    if (icon._image == null) {
      const pos = await DmiIcon.getSheetPosition(icon);
      icon._image = Some(icon._sheet._image).crop({x: pos.x, y: pos.y,
          width: icon._sheet.iconWidth, height: icon._sheet.iconHeight});
    }

    return icon._image;
  }

}

/// A generic (x,y) point
export class Point {
  constructor(public x: number, public y: number) {}

  equals(point: Point) {
    return point instanceof Point && point.x === this.x && point.y === this.y;
  }

  get hashCode(): number {
    // http://stackoverflow.com/a/113600/333814

    var result = 503;
    result = 37 * result + this.x;
    return 37 * result + this.y;
  }

  toString() { return '$x,$y'; }
}
