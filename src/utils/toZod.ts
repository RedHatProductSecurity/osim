// https://github.com/colinhacks/zod/issues/53
// https://gist.github.com/colinhacks/074a8509cd506fdc1f96cad27cc20c77
import * as z from 'zod';

type isAny<T> = [any extends T ? 'true' : 'false'] extends ['true']
  ? true
  : false;
type nonoptional<T> = T extends undefined ? never : T;
type nonnullable<T> = T extends null ? never : T;
type equals<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

export type toZod<T> = {
  any: never;
  array: T extends Array<infer U> ? z.ZodArray<toZod<U>> : never;
  bigint: z.ZodBigInt;
  boolean: z.ZodBoolean;
  date: z.ZodDate;
  nullable: z.ZodUnion<[toZod<nonnullable<T>>, z.ZodNull]>;
  number: z.ZodNumber;
  object: z.ZodObject<{ [k in keyof T]: toZod<T[k]> }, 'strict'>;
  optional: z.ZodUnion<[toZod<nonoptional<T>>, z.ZodUndefined]>;

  rest: never;
  string: z.ZodString;
}[zodKey<T>];

// @formatter:off
type zodKey<T> = isAny<T> extends true
  ? 'any'
  : equals<T, boolean> extends true // [T] extends [booleanUtil.Type]
    ? 'boolean'
    : [undefined] extends [T]
        ? 'optional'
        : [null] extends [T]
            ? 'nullable'
            : T extends any[]
              ? 'array'
              : equals<T, string> extends true
                ? 'string'
                : equals<T, bigint> extends true // [T] extends [bigintUtil.Type]
                  ? 'bigint'
                  : equals<T, number> extends true // [T] extends [numberUtil.Type]
                    ? 'number'
                    : equals<T, Date> extends true // [T] extends [dateUtil.Type]
                      ? 'date'
                      : T extends { [k: string]: any } // [T] extends [structUtil.Type]
                        ? 'object'
                        : 'rest';
// @formatter:on
