"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ArgumentError: () => ArgumentError,
  DescriptionParseError: () => DescriptionParseError,
  DmiIcon: () => DmiIcon,
  DmiParseError: () => DmiParseError,
  DmiSheet: () => DmiSheet,
  DmiState: () => DmiState,
  MovieState: () => MovieState,
  PixmapState: () => PixmapState,
  PngParseError: () => PngParseError,
  Some: () => Some
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var DmiParseError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DmiParseError";
  }
};
var PngParseError = class extends DmiParseError {
  constructor(message) {
    super(message);
    this.name = "PngParseError";
  }
};
var DescriptionParseError = class extends DmiParseError {
  constructor(message) {
    super(message);
    this.name = "DescriptionParseError";
  }
};
var ArgumentError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ArgumentError";
  }
};

// src/description_parser.ts
var Statement = class {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
  toString = () => "$key = $value";
};
var Block = class {
  constructor(header) {
    this.header = header;
  }
  children = [];
  toString = () => this.header.toString() + this.children.map((i) => `	${i.toString()}
`).join("");
};
var StringScanner = class {
  constructor(str) {
    this.str = str;
    this.pos = 0;
  }
  pos;
  lastMatch = null;
  scan = (pattern) => {
    const regex = new RegExp(pattern, "g");
    const match = regex.exec(this.str.substring(this.pos));
    if (match) {
      this.pos += regex.lastIndex;
      this.lastMatch = match;
      return true;
    }
    return false;
  };
  isDone = () => this.pos === this.str.length;
};
var parseDmiDescription = (source) => {
  const blocks = [];
  var scanner = new StringScanner(source);
  if (!scanner.scan(/.*# BEGIN DMI\n/)) {
    throw new DescriptionParseError(
      "Could not find opening tag in description."
    );
  }
  let currentBlock = null;
  const headerRegex = /^(\w+)\s+=\s+(.*)\n/g;
  const blockRegex = /\t(\w+)\s+=\s+(.*)\n/g;
  const endMarkerRegex = /# END DMI/g;
  do {
    if (scanner.scan(headerRegex)) {
      if (currentBlock != null) {
        blocks.push(currentBlock);
      }
      if (!scanner.lastMatch) throw new DescriptionParseError("Scanner found header, but match is missing.");
      currentBlock = new Block(new Statement(scanner.lastMatch[1], scanner.lastMatch[2]));
    } else if (scanner.scan(blockRegex)) {
      if (currentBlock == null) {
        throw new DescriptionParseError(
          'Found indented section "${scanner.lastMatch[0]}", but no block header'
        );
      }
      if (!scanner.lastMatch) throw new DescriptionParseError("Scanner found indented section, but match is missing.");
      currentBlock.children.push(new Statement(scanner.lastMatch[1], scanner.lastMatch[2]));
    } else if (scanner.scan(endMarkerRegex)) {
      if (currentBlock != null) {
        blocks.push(currentBlock);
      }
      return blocks;
    } else {
      throw new DescriptionParseError("Encountered unexpected characters.");
    }
  } while (!scanner.isDone());
  throw new DescriptionParseError('Encountered the end of the description string without finding an "# END DMI" line.');
};
var stripQuotes = (input) => input.trim().substring(1, input.length - 1);
var stringToIntList = (input, separator = ",") => input.split(separator).map((i) => Number(i));

// src/maybe.ts
function Some(maybe) {
  if (maybe == null) throw new TypeError("Attempted to resolve Some(null).");
  return maybe;
}

// src/dmi_sheet.ts
var import_image_js = require("image-js");

// src/png_reader.ts
var import_pako = __toESM(require("pako"));
var _pngMagicNumbers = [137, 80, 78, 71, 13, 10, 26, 10];
var getZtxt = (bytes, targetKeyword = "Description") => {
  let bytePos = 0;
  const bytesData = new DataView(bytes.buffer);
  for (const magicNumber of _pngMagicNumbers) {
    if (magicNumber != bytes[bytePos++]) {
      throw new PngParseError("PNG header does not match.");
    }
  }
  while (bytePos < bytes.length) {
    const chunkLength = bytesData.getUint32(bytePos);
    bytePos += 4;
    const chunkType = bytes.slice(bytePos, bytePos + 4).reduce((acc, c) => acc + String.fromCharCode(c), "");
    bytePos += 4;
    if (chunkType == "zTXt") {
      const startPos = bytePos;
      while (bytes[bytePos] != 0) bytePos++;
      const keywordString = bytes.slice(startPos, bytePos).reduce((acc, c) => acc + String.fromCharCode(c), "");
      if (keywordString == targetKeyword) {
        if (bytes[++bytePos] != 0) {
          throw new DmiParseError("zTXt chunk with unknown compression method.");
        }
        return import_pako.default.inflate(bytes.slice(++bytePos, startPos + chunkLength), { to: "string" });
      } else {
        bytePos = startPos + chunkLength + 4;
      }
    } else {
      bytePos += chunkLength + 4;
    }
  }
};
var png_reader_default = getZtxt;

// src/dmi_sheet.ts
var DmiSheet = class _DmiSheet {
  _bytes;
  /// Width of each icon in the sheet
  iconWidth = 0;
  /// Height of each icon in the sheet
  iconHeight = 0;
  /// Height of the whole sprite sheet
  _imageHeight = 0;
  /// Width of the whole sprite sheet
  _imageWidth = 0;
  /// The spritesheet
  _image = new import_image_js.Image();
  get image() {
    return Some(this._image);
  }
  /// Whole sprite sheet as image
  static async loadImage(sheet) {
    if (sheet._image == null) {
      sheet._image = await import_image_js.Image.load(Some(sheet._bytes));
      sheet._bytes = void 0;
    }
    return sheet._image;
  }
  /// Number of icons horizontally in one row of the sprite sheet
  getColumnCount() {
    return Math.floor(this.image.width / this.iconWidth);
  }
  /// Number of icons vertically in one column of the sprite sheet
  getRowCount() {
    return Math.floor(this.image.height / this.iconHeight);
  }
  /// Icon states defined for this dmi sheet
  get states() {
    return this._states;
  }
  _states = [];
  _statesByName = {};
  /// Return state with the given name or `null` if not present
  getStateNamed(name) {
    return this._statesByName[name];
  }
  /// Get the coordinates for the upper left of an icon in the spritesheet
  ///
  /// `index` starts at 0 and advances row first. Note that this function will
  /// **not** throw a [RangeError] if the last row isn't full and it's asked
  /// coordinates for an icon that would have been there, had the row been full.
  /// It will throw a [RangeError] for indices that couldn't possibly be on the
  /// sheet.
  getIconCoords(index) {
    if (index < 0) {
      throw new RangeError("Icon index cannot be less than 0");
    }
    var row = Math.floor(index / this.getColumnCount());
    if (row > this.getRowCount()) {
      throw new RangeError("Index $index is outside of sheet");
    }
    let col = index % this.getColumnCount();
    return new Point(col * this.iconWidth, row * this.iconHeight);
  }
  /// Load from a dmi file loaded into a list of bytes
  static async fromBytes(bytes) {
    const sheet = new _DmiSheet();
    sheet._bytes = bytes;
    const blocks = parseDmiDescription(Some(png_reader_default(bytes)));
    const firstBlock = Some(blocks.shift());
    if (firstBlock.header.key != "version") {
      throw new DescriptionParseError(
        "Description does not open with a version header (opened with $firstBlock.header)"
      );
    }
    const majorVersionRegExp = new RegExp(/(\d+).(\d+)/);
    const majorVersionMatches = Some(majorVersionRegExp.exec(firstBlock.header.value));
    const majorVersion = Number.parseInt(majorVersionMatches[1]);
    let iconWidth;
    let iconHeight;
    if (majorVersion != 4) {
      throw new DmiParseError("Incompatible major dmi version");
    }
    for (var statement of firstBlock.children) {
      if (statement.key == "width") {
        sheet.iconWidth = Number.parseInt(statement.value);
      } else if (statement.key == "height") {
        sheet.iconHeight = Number.parseInt(statement.value);
      }
    }
    if (sheet.iconWidth == null || sheet.iconHeight == null) {
      throw new DmiParseError("Description does not specify icon dimensions");
    }
    var iconCount = 0;
    for (var block of blocks) {
      var state = DmiState._fromBlock(block, sheet, iconCount);
      iconCount += state.getIconCount();
      sheet._states.push(state);
      sheet._statesByName[state.name] = state;
    }
    Object.freeze(sheet._states);
    sheet._image = void 0;
    sheet._image = await this.loadImage(sheet);
    return sheet;
  }
};
var DmiState = class {
  /// name: State name, the string which is used to refer to the state in DM code
  constructor(name, movement, dmiStateType) {
    this.name = name;
    this.movement = movement;
    this.dmiStateType = dmiStateType;
  }
  /// Total number of icons in the state
  getIconCount() {
    throw new ArgumentError("getIconCount called on abstract DmiState");
  }
  /// Convenience function for getting a representative icon for this state
  getThumbnail() {
    throw new ArgumentError("getThumbnail called on abstract DmiState");
  }
  /// Parse a description [Block] describing a state and instantiate that state
  ///
  /// [iconCount] is used to determine the index offset for the new icons
  static _fromBlock = (block, sheet, iconCount) => {
    let dirCount = -1;
    let frameCount = -1;
    let name;
    let delays = [];
    let movement = false;
    const hotspots = {};
    if (block.header.key !== "state") {
      throw new DmiParseError("Invalid state header $block.header");
    }
    name = stripQuotes(block.header.value);
    for (var child of block.children) {
      if (child.key == "dirs") {
        dirCount = Number(child.value);
      } else if (child.key == "frames") {
        frameCount = Number.parseInt(child.value);
      } else if (child.key == "movement") {
        movement = child.value == "1";
      } else if (child.key == "delay") {
        delays = stringToIntList(child.value);
      } else if (child.key == "hotspot") {
        var hotspot = stringToIntList(child.value);
        hotspots[hotspot[2]] = new Point(hotspot[0], hotspot[1]);
      }
    }
    if (!dirCount || !frameCount || !name || !name.length) {
      throw new DmiParseError("Incomplete specification for $block.header");
    }
    if (dirCount * frameCount == 1) {
      return new PixmapState(name, new DmiIcon(sheet, iconCount, hotspots[1]), movement);
    } else {
      let availableDirs;
      if (dirCount == 1) {
        availableDirs = ["none" /* none */];
      } else {
        availableDirs = Object.values(IconDirection).slice(1, dirCount + 1);
      }
      const icons = /* @__PURE__ */ new Map();
      availableDirs.forEach((dir2) => {
        const _emptyFrames = new Array(frameCount);
        _emptyFrames.fill(void 0);
        Object.seal(_emptyFrames);
        icons.set(dir2, _emptyFrames);
      });
      var hotspotIndex = 1;
      var globalIndex = iconCount;
      for (var frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        for (var dir of availableDirs) {
          Some(icons.get(dir))[frameIndex] = new DmiIcon(sheet, globalIndex, hotspots[hotspotIndex]);
          globalIndex++;
          hotspotIndex++;
        }
      }
      if (!!delays.length) {
        delays = delays.slice(0, frameCount);
      }
      return new MovieState(
        name,
        icons,
        delays,
        frameCount,
        dirCount,
        movement
      );
    }
  };
};
var PixmapState = class extends DmiState {
  constructor(name, icon, movement = false) {
    super(name, movement, 0 /* Pixmap */);
    this.icon = icon;
  }
  getIconCount() {
    return 1;
  }
  // Pixmap is always one icon
  getThumbnail() {
    return this.icon.loadImage();
  }
};
var MovieState = class extends DmiState {
  /// icons: List mapping directions to lists of animation frames
  /// delays: Animation delays for each frame of the animation.
  ///
  /// These delays are the same for every direction. The list will always have
  /// as many items as [framesCount], even if the delays list defined in the dmi
  /// itself is longer.
  constructor(name, icons, delays, framesCount = 1, directionsCount = 1, movement = false) {
    super(name, movement, 1 /* Movie */);
    this.icons = icons;
    this.delays = delays;
    this.framesCount = framesCount;
    this.directionsCount = directionsCount;
  }
  getIconCount() {
    return this.framesCount * this.directionsCount;
  }
  /// Get first icon in first direction, for use as thumbnail
  getThumbnail() {
    return Some(Some(this.icons.entries().next().value)[1])[0].loadImage();
  }
};
var IconDirection = /* @__PURE__ */ ((IconDirection2) => {
  IconDirection2["none"] = "none";
  IconDirection2["south"] = "south";
  IconDirection2["north"] = "north";
  IconDirection2["east"] = "east";
  IconDirection2["west"] = "west";
  IconDirection2["southeast"] = "southeast";
  IconDirection2["southwest"] = "southwest";
  IconDirection2["northeast"] = "northeast";
  IconDirection2["northwest"] = "northwest";
  return IconDirection2;
})(IconDirection || {});
var DmiIcon = class {
  /// Create an image, optionally specifying a hotspot
  ///
  /// [_sheet] is the sheet in which this icon can be found, [_index] is the
  /// index of the icon within the sheet
  constructor(_sheet, _index, hotspot = void 0) {
    this._sheet = _sheet;
    this._index = _index;
    this.hotspot = hotspot;
  }
  _image;
  /// Coordinates for this icon in the sprite sheet
  ///
  /// Coordinates are the upper left corner pixel of the icon, 0-indexed, with
  /// the origin in the upper left of the sheet and all numbers positve.
  getSheetPosition() {
    return this._sheet.getIconCoords(this._index);
  }
  loadImage() {
    if (this._image == null) {
      const pos = this.getSheetPosition();
      this._image = Some(this._sheet._image).crop({
        x: pos.x,
        y: pos.y,
        width: this._sheet.iconWidth,
        height: this._sheet.iconHeight
      });
    }
    return this._image;
  }
};
var Point = class _Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  equals(point) {
    return point instanceof _Point && point.x === this.x && point.y === this.y;
  }
  get hashCode() {
    var result = 503;
    result = 37 * result + this.x;
    return 37 * result + this.y;
  }
  toString() {
    return "$x,$y";
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ArgumentError,
  DescriptionParseError,
  DmiIcon,
  DmiParseError,
  DmiSheet,
  DmiState,
  MovieState,
  PixmapState,
  PngParseError,
  Some
});
