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
  DmiParseError: () => DmiParseError,
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

// src/maybe.ts
function Some(maybe) {
  if (maybe == null) throw new TypeError("Attempted to resolve Some(null).");
  return maybe;
}

// src/dmi_sheet.ts
var import_image_js = require("image-js");

// src/png_reader.ts
var import_pako = __toESM(require("pako"));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ArgumentError,
  DescriptionParseError,
  DmiParseError,
  PngParseError,
  Some
});
