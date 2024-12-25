export interface Dictionary<T> {
  [Key: string | number]: T;
}

export interface NumericDictionary<T> {
  [Key: number]: T;
}
