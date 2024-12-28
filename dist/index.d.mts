import { Image } from 'image-js';

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
interface Point {
    x: number;
    y: number;
    hashcode: number;
    toString: () => string;
    equals: (point: Point) => boolean;
}

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

export { ArgumentError, DescriptionParseError, type Dictionary, type DmiIcon, DmiParseError, type DmiSheet, type DmiState, type Maybe, type NumericDictionary, PngParseError, Some };
