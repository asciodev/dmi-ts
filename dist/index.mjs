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
import { Image } from "image-js";

// src/png_reader.ts
import pako from "pako";
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
        return pako.inflate(bytes.slice(++bytePos, startPos + chunkLength), { to: "string" });
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
async function createDmiSheet(bytes) {
  let iconWidth = 0;
  let iconHeight = 0;
  let imageHeight = 0;
  let imageWidth = 0;
  let image = await Image.load(bytes);
  const getColumnCount = () => {
    return Math.floor(image.width / iconWidth);
  };
  const getRowCount = () => {
    return Math.floor(image.height / iconHeight);
  };
  const states = () => {
    return _states;
  };
  const _states = [];
  const _statesByName = {};
  const getStateNamed = (name) => {
    return _statesByName[name];
  };
  const getIconCoords = (index) => {
    if (index < 0) {
      throw new RangeError("Icon index cannot be less than 0");
    }
    var row = Math.floor(index / getColumnCount());
    if (row > getRowCount()) {
      throw new RangeError("Index $index is outside of sheet");
    }
    let col = index % getColumnCount();
    return createPoint(col * iconWidth, row * iconHeight);
  };
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
  if (majorVersion != 4) {
    throw new DmiParseError("Incompatible major dmi version");
  }
  for (var statement of firstBlock.children) {
    if (statement.key == "width") {
      iconWidth = Number.parseInt(statement.value);
    } else if (statement.key == "height") {
      iconHeight = Number.parseInt(statement.value);
    }
  }
  if (iconWidth == null || iconHeight == null) {
    throw new DmiParseError("Description does not specify icon dimensions");
  }
  var iconCount = 0;
  const sheet = {
    iconWidth,
    iconHeight,
    imageWidth,
    imageHeight,
    getIconCoords,
    image,
    columnCount: getColumnCount(),
    rowCount: getRowCount(),
    states: _states,
    getStateNamed
  };
  for (var block of blocks) {
    var state = createDmiState(block, sheet, iconCount);
    iconCount += state.iconCount;
    _states.push(state);
    _statesByName[state.name] = state;
  }
  Object.freeze(_states);
  return sheet;
}
var DmiStateType = /* @__PURE__ */ ((DmiStateType2) => {
  DmiStateType2[DmiStateType2["Pixmap"] = 0] = "Pixmap";
  DmiStateType2[DmiStateType2["Movie"] = 1] = "Movie";
  return DmiStateType2;
})(DmiStateType || {});
function createDmiState(block, sheet, iconCount) {
  const name = stripQuotes(block.header.value);
  let dirCount = -1;
  let frameCount = -1;
  let delays = [];
  let movement = false;
  const hotspots = {};
  if (block.header.key !== "state") {
    throw new DmiParseError("Invalid state header $block.header");
  }
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
      hotspots[hotspot[2]] = createPoint(hotspot[0], hotspot[1]);
    }
  }
  if (!dirCount || !frameCount || name == null) {
    throw new DmiParseError("Incomplete specification for $block.header");
  }
  if (dirCount * frameCount == 1) {
    const icons = /* @__PURE__ */ new Map();
    const icon = [createDmiIcon(sheet, iconCount, hotspots[1])];
    icons.set("none" /* none */, icon);
    const thumbnail = icon[0].image;
    return { name, icons, movement, sheet, thumbnail, frameCount, dirCount, delays, iconCount: 1, type: 0 /* Pixmap */ };
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
        Some(icons.get(dir))[frameIndex] = createDmiIcon(sheet, globalIndex, hotspots[hotspotIndex]);
        globalIndex++;
        hotspotIndex++;
      }
    }
    if (!!delays.length) {
      delays = delays.slice(0, frameCount);
    }
    const thumbnail = Some(Some(icons.entries().next().value)[1])[0].image;
    return { name, icons, movement, sheet, thumbnail, frameCount, dirCount, delays, iconCount: frameCount * dirCount, type: 1 /* Movie */ };
  }
}
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
function createDmiIcon(sheet, index, hotspot) {
  const sheetPosition = sheet.getIconCoords(index);
  const image = sheet.image.crop({
    x: sheetPosition.x,
    y: sheetPosition.y,
    width: sheet.iconWidth,
    height: sheet.iconHeight
  });
  return { sheet, index, hotspot, sheetPosition, image };
}
function createPoint(x, y) {
  const equals = (point) => {
    return point.x === x && point.y === y;
  };
  var result = 503;
  result = 37 * result + x;
  const hashcode = 37 * result + y;
  const toString = () => {
    return "$x,$y";
  };
  return { x, y, hashcode, equals };
}
export {
  ArgumentError,
  DescriptionParseError,
  DmiParseError,
  DmiStateType,
  IconDirection,
  PngParseError,
  Some,
  createDmiIcon,
  createDmiSheet,
  createDmiState,
  createPoint
};
