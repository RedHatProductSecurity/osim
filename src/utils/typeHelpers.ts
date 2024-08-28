export type ValueOf<T> = T[keyof T];

export type Nullable<T> = T | null | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;
