import {DescriptionParseError} from './errors';

/// A single key-value pair in a dmi description. Both key and value are always
/// strings
export class Statement {
  constructor(public key: string, public value: string) {}

  toString = () => '$key = $value';
}

/// A single block in a dmi description, along with the header
export class Block {
  constructor(public header: Statement) {}
  children: Statement[] = [];
  toString = () => this.header.toString() + this.children.map((i) => `\t${i.toString()}\n`).join('');
}

class StringScanner {
  pos: number;
  lastMatch: RegExpExecArray | null = null;
  constructor(public str: string) {
    this.pos = 0;
  }

  scan = (pattern: RegExp) => {
    const regex = new RegExp(pattern, "g");
    const match = regex.exec(this.str.substring(this.pos));

    if (match) {
      this.pos += regex.lastIndex;
      this.lastMatch = match;
      return true;
    }

    return false;
  }

  isDone = () => this.pos === this.str.length;

}

/// Lex a dmi description
///
/// This is a parser which parses the descriptions contained in dmi files. This
/// function returns a list of blocks. Each block consists of a heading (a
/// key-value pair), and any number of key-value pairs inside the block.
export const parseDmiDescription: (source: string) => Block[] = (source: string) => {
  const blocks: Block[] = [];
  var scanner = new StringScanner(source);

  if (!scanner.scan(/.*# BEGIN DMI\n/)) {
    throw new DescriptionParseError(
        'Could not find opening tag in description.');
  }

  let currentBlock: Block | null = null;

  const headerRegex = /^(\w+)\s+=\s+(.*)\n/g;
  const blockRegex = /\t(\w+)\s+=\s+(.*)\n/g;
  const endMarkerRegex = /# END DMI/g;

  do {
    if (scanner.scan(headerRegex)) {
      if (currentBlock != null) {
        blocks.push(currentBlock);
      }
      if(!scanner.lastMatch) throw new DescriptionParseError('Scanner found header, but match is missing.');
      currentBlock = new Block(new Statement(scanner.lastMatch[1], scanner.lastMatch[2]));
    } else if (scanner.scan(blockRegex)) {
      if (currentBlock == null) {
        throw new DescriptionParseError(
            'Found indented section "${scanner.lastMatch[0]}", but no block header');
      }
      if(!scanner.lastMatch) throw new DescriptionParseError('Scanner found indented section, but match is missing.');
      currentBlock.children.push(new Statement(scanner.lastMatch[1], scanner.lastMatch[2]));
    } else if (scanner.scan(endMarkerRegex)) {
      if (currentBlock != null) {
        blocks.push(currentBlock);
      }
      return blocks;
    } else {
      throw new DescriptionParseError('Encountered unexpected characters.');
    }
  } while (!scanner.isDone());

  throw new DescriptionParseError('Encountered the end of the description string without finding an "# END DMI" line.');
}

/// Trim quotes off a quoted string in a DMI description
///
/// Warning: Doesn't actually strip quotes, just trims spaces and chomps the two
/// outermost characters
export const stripQuotes = (input: string) => input.trim().substring(1, input.length - 1);

export const stringToIntList = (input: string, separator=',') => input.split(separator).map((i) => Number(i));
