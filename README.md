# dmi-ts

A Typescript package for reading `.dmi` spritesheet files used by the [BYOND](https://www.byond.com) platform, ported from [@DeeUnderscore's dart library dmi_read](https://github.com/DeeUnderscore/dmi_read).

## Background
BYOND is a proprietary game engine and platform, allowing creation of 2D tile-based multiplayer games through its Dream Maker component.

In BYOND game sources, sprites are kept in `.dmi` files. `.dmi` files are sprite sheets in a PNG file with a `zTXt` chunk containing metadata which describes the frames in the sprite sheet. An image viewer or editor will generally be able to open the whole sprite sheet, however, figuring out where the individual sprites are, and how they are grouped requires parsing the attached `.dmi` metadata.

## Example
Print the names of every state in `foo.dmi`:

~~~~typescript
const sheet: DmiSheet = DmiSheet.fromBytes(await readFile('foo.dmi'));
sheet.states.forEach((state) {
  print(state.name);
});
~~~~

## Project
`dmi-ts` is free software licensed under the ISC license. See the [`LICENSE`](LICENSE) file for details.

Bug reports and pull requests can be filed at [github.com/asciodev/dmi-ts](https://github.com/asciodev/dmi-ts).
