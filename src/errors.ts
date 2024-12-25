export class DmiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DmiParseError";
  }
}

export class PngParseError extends DmiParseError {
  constructor(message: string) {
    super(message);
    this.name = "PngParseError";
  }
}

export class DescriptionParseError extends DmiParseError {
  constructor(message: string) {
    super(message);
    this.name = "DescriptionParseError";
  }
}

export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgumentError";
  }
}
