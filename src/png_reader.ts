import pako from 'pako';
import { PngParseError, DmiParseError } from './errors';
const _pngMagicNumbers = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/// Find a zTXt in a PNG and return its decompressed contents
///
/// This function goes through all the chunks in the supplied PNG bytes, finds
/// the first zTXt chunk, decompresses it and returns the string inside.
///
/// By default, it looks for the zTXt chunk with the keword 'Description'. Other
/// chunks can be fetched using [targetKeyword]. The default is what dmi uses.
///
/// It will throw [DmiParseError] if either it encouters a problem going through
/// the chunks or fails to find a zTXt chunk.
const getZtxt: (bytes: Uint8Array, targetKeyword?: string) => string | undefined = (bytes, targetKeyword = "Description") => {
  let bytePos = 0;
  const bytesData = new DataView(bytes.buffer);

  // dmis are valid PNGs, so we check for a valid PNG header first
  for(const magicNumber of _pngMagicNumbers) {
    if(magicNumber != bytes[bytePos++]) {
      throw new PngParseError('PNG header does not match.');
    }
  }

  // Now we go through all the chunks and figure out what they are
  while(bytePos < bytes.length) {
    // Length of the chunk payload, 4 bytes, unsigned int
    const chunkLength = bytesData.getUint32(bytePos);
    bytePos += 4;

    // Chunk type, 4 bytes, ASCII
    const chunkType = bytes.slice(bytePos, bytePos + 4).reduce((acc, c) => acc + String.fromCharCode(c), '');
    bytePos += 4;

    if (chunkType == 'zTXt') {
      const startPos = bytePos;
      while (bytes[bytePos] != 0) bytePos++;

      const keywordString = bytes.slice(startPos, bytePos).reduce((acc, c) => acc + String.fromCharCode(c), '');

      if (keywordString == targetKeyword) {
        if (bytes[++bytePos] != 0) {
          // The only valid compression method is 0, but we check in case BYOND does something really weird
          throw new DmiParseError('zTXt chunk with unknown compression method.');
        } 
        return pako.inflate(bytes.slice(++bytePos, (startPos + chunkLength)), { to: 'string' });
      } else {
        // some other zTXt chunk. Skip it and its CRC.
        bytePos = startPos + chunkLength + 4;
      }
    } else {
      // Non-zTXt chunk, skip it and the CRC
      bytePos += chunkLength + 4; // skip 4 byte CRC that follows data
    }
  }
}

export default getZtxt;
