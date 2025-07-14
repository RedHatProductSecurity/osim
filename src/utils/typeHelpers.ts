export type ValueOf<T> = T[keyof T];

export type Nullable<T> = null | T | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type DeepMapValues<T, V> = T extends Array<infer U>
  ? DeepMapValues<U, V>[]
  : T extends object
    ? { [K in keyof T]: DeepMapValues<T[K], V> }
    : V;

export type DeepNullable<T> = T extends Array<infer U>
  ? DeepNullable<U>[] | null
  : T extends object
    ? { [K in keyof T]: DeepNullable<T[K]> }
    : null | T;
