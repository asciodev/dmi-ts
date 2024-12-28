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

// src/maybe.ts
function Some(maybe) {
  if (maybe == null) throw new TypeError("Attempted to resolve Some(null).");
  return maybe;
}

// src/dmi_sheet.ts
import { Image } from "image-js";

// src/png_reader.ts
import pako from "pako";
export {
  ArgumentError,
  DescriptionParseError,
  DmiParseError,
  PngParseError,
  Some
};
