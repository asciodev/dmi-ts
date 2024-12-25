export type Maybe<T> = NonNullable<T> | undefined;
export function Some<T>(maybe: Maybe<T>): T {
  if(maybe == null) throw new TypeError("Attempted to resolve Some(null).");
  return maybe as T;
}
