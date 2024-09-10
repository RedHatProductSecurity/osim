export type ValueOf<T> = T[keyof T];

export type Nullable<T> = null | T | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;
