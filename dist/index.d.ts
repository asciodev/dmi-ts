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

interface Dictionary<T> {
    [Key: string | number]: T;
}
interface NumericDictionary<T> {
    [Key: number]: T;
}

type Maybe<T> = NonNullable<T> | undefined;
declare function Some<T>(maybe: Maybe<T>): T;

declare class DmiSheet {
    _bytes: Maybe<Uint8Array>;
    iconWidth: number;
    iconHeight: number;
    _imageHeight: number;
    _imageWidth: number;
    _image?: Image;
    get image(): Image;
    static loadImage(sheet: DmiSheet): Promise<Image>;
    getColumnCount(): number;
    getRowCount(): number;
    get states(): DmiState[];
    _states: DmiState[];
    _statesByName: Dictionary<DmiState>;
    getStateNamed(name: string): DmiState;
    getIconCoords(index: number): Point;
    static fromBytes(bytes: Uint8Array): Promise<DmiSheet>;
}
declare enum DmiStateType {
    Pixmap = 0,
    Movie = 1
}
declare abstract class DmiState {
    name: string;
    movement: boolean;
    dmiStateType: DmiStateType;
    constructor(name: string, movement: boolean, dmiStateType: DmiStateType);
    getIconCount(): number;
    getThumbnail(): Image;
    static _fromBlock: (block: Block, sheet: DmiSheet, iconCount: number) => PixmapState | MovieState;
}
declare class PixmapState extends DmiState {
    icon: DmiIcon;
    constructor(name: string, icon: DmiIcon, movement?: boolean);
    getIconCount(): number;
    getThumbnail(): Image;
}
declare class MovieState extends DmiState {
    icons: Map<IconDirection, DmiIcon[]>;
    delays?: number[] | undefined;
    framesCount: number;
    directionsCount: number;
    constructor(name: string, icons: Map<IconDirection, DmiIcon[]>, delays?: number[] | undefined, framesCount?: number, directionsCount?: number, movement?: boolean);
    getIconCount(): number;
    getThumbnail(): Image;
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
declare class DmiIcon {
    _sheet: DmiSheet;
    _index: number;
    hotspot: Maybe<Point>;
    constructor(_sheet: DmiSheet, _index: number, hotspot?: Maybe<Point>);
    _image: Maybe<Image>;
    getSheetPosition(): Point;
    loadImage(): Image;
}
declare class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
    equals(point: Point): boolean;
    get hashCode(): number;
    toString(): string;
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

export { ArgumentError, DescriptionParseError, type Dictionary, DmiIcon, DmiParseError, DmiSheet, DmiState, type Maybe, MovieState, type NumericDictionary, PixmapState, PngParseError, Some };
