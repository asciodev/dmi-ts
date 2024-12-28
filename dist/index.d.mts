import { Image } from 'image-js';

declare class Statement {
    key: string;
    value: string;
    constructor(key: string, value: string);
    toString: () => string;
}
declare class Block {
    header: Statement;
    constructor(header: Statement);
    children: Statement[];
    toString: () => string;
}

type Maybe<T> = NonNullable<T> | undefined;
declare function Some<T>(maybe: Maybe<T>): T;

interface DmiSheet {
    iconWidth: number;
    iconHeight: number;
    imageWidth: number;
    imageHeight: number;
    image: Image;
    columnCount: number;
    rowCount: number;
    states: DmiState[];
    getIconCoords: (idx: number) => Point;
    getStateNamed: (name: string) => DmiState;
}
declare function createDmiSheet(bytes: Uint8Array): Promise<DmiSheet>;
declare enum DmiStateType {
    Pixmap = 0,
    Movie = 1
}
interface DmiState {
    name: string;
    icons: Map<IconDirection, DmiIcon[]>;
    movement: boolean;
    sheet: DmiSheet;
    thumbnail: Image;
    frameCount: number;
    dirCount: number;
    delays: number[];
    iconCount: number;
    type: DmiStateType;
}
declare function createDmiState(block: Block, sheet: DmiSheet, iconCount: number): DmiState;
declare enum IconDirection {
    none = "none",
    south = "south",
    north = "north",
    east = "east",
    west = "west",
    southeast = "southeast",
    southwest = "southwest",
    northeast = "northeast",
    northwest = "northwest"
}
interface DmiIcon {
    sheet: DmiSheet;
    index: number;
    hotspot: Maybe<Point>;
    sheetPosition: Point;
    image: Image;
}
declare function createDmiIcon(sheet: DmiSheet, index: number, hotspot?: Maybe<Point>): DmiIcon;
interface Point {
    x: number;
    y: number;
    hashcode: number;
    toString: () => string;
    equals: (point: Point) => boolean;
}
declare function createPoint(x: number, y: number): Point;

declare class DmiParseError extends Error {
    constructor(message: string);
}
declare class PngParseError extends DmiParseError {
    constructor(message: string);
}
declare class DescriptionParseError extends DmiParseError {
    constructor(message: string);
}
declare class ArgumentError extends Error {
    constructor(message: string);
}

interface Dictionary<T> {
    [Key: string | number]: T;
}
interface NumericDictionary<T> {
    [Key: number]: T;
}

export { ArgumentError, DescriptionParseError, type Dictionary, type DmiIcon, DmiParseError, type DmiSheet, type DmiState, DmiStateType, IconDirection, type Maybe, type NumericDictionary, PngParseError, Some, createDmiIcon, createDmiSheet, createDmiState, createPoint };
