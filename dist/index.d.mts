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
    iconWidth: Maybe<number>;
    iconHeight: Maybe<number>;
    _imageHeight: Maybe<number>;
    _imageWidth: Maybe<number>;
    static getImageHeight(sheet: DmiSheet): Promise<number>;
    static getImageWidth(sheet: DmiSheet): Promise<number>;
    _image: Maybe<Image>;
    static loadImage(sheet: DmiSheet): Promise<Image>;
    static getColumnCount(sheet: DmiSheet): Promise<number>;
    static getRowCount(sheet: DmiSheet): Promise<number>;
    get states(): DmiState[];
    _states: DmiState[];
    _statesByName: Dictionary<DmiState>;
    getStateNamed(name: string): DmiState;
    static getIconCoords(sheet: DmiSheet, index: number): Promise<Point>;
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
    static getIconCount(_: DmiState): Promise<number>;
    static getThumbnail(_: DmiState): Promise<Image>;
    static _fromBlock: (block: Block, sheet: DmiSheet, iconCount: number) => PixmapState | MovieState;
}
declare class PixmapState extends DmiState {
    icon: DmiIcon;
    constructor(name: string, icon: DmiIcon, movement?: boolean);
    static getIconCount(_: PixmapState): Promise<number>;
    static getThumbnail(state: PixmapState): Promise<Image>;
}
declare class MovieState extends DmiState {
    icons: Map<IconDirection, DmiIcon[]>;
    delays: number[];
    framesCount: number;
    directionsCount: number;
    constructor(name: string, icons: Map<IconDirection, DmiIcon[]>, delays: number[], framesCount?: number, directionsCount?: number, movement?: boolean);
    static getIconCount(state: MovieState): Promise<number>;
    static getThumbnail(state: MovieState): Promise<Image>;
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
    static getSheetPosition(icon: DmiIcon): Promise<Point>;
    static loadImage(icon: DmiIcon): Promise<Image>;
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
