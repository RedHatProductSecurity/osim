import { toRaw, isRef, isReactive, isProxy, ref, toRef, watch, unref } from 'vue';
import { DateTime } from 'luxon';
import * as R from 'ramda';

export function watchedPropRef(prop: Record<string, any>, property: string, defaultValue: any) {
  const reffedProp = toRef(prop, property);
  const flexRef = reffedProp.value === undefined ? ref(defaultValue) : reffedProp;
  watch(reffedProp, (value) => flexRef.value = value);
  return flexRef;
}

export function unwrap (value: any): any {
  const unwrapped = toRaw(unref(value));
  return isUnwrappable(unwrapped) ? unwrap(unwrapped) : unwrapped;
}

function isUnwrappable (value: any) {
  return isRef(value) || isReactive(value) || isProxy(value);
}

export function deepCopyFromRaw<T extends Record<string, any>>(sourceObj: T): T {
  const objectIterator = (input: any): any => {
    if (isUnwrappable(input)) {
      return objectIterator(unwrap(input));
    }

    if (Array.isArray(input)) {
      return input.map((item) => objectIterator(item));
    }

    if (input !== null && typeof input === 'object') {
      return Object.keys(input).reduce((acc, key) => {
        acc[key as keyof typeof acc] = objectIterator(input[key]);
        return acc;
      }, {} as T);
    }
    return input;
  };

  return objectIterator(sourceObj);
}

// export function deepCopyFromRaw<T extends Record<string, any>>(sourceObj: T): T {
//   return JSON.parse(JSON.stringify(deepToRaw(sourceObj)));
// }

// eslint-disable-next-line max-len
// https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects
export const groupBy = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string,
) =>
    array.reduce(
      (acc, value, index, array) => {
        (acc[predicate(value, index, array)] ||= []).push(value);
        return acc;
      },
    {} as { [key: string]: T[] },
    );

export const assignKeyValue = (object: Record<string, any>, key: string, value: any = null) => {
  object[key] = value;
  return object;
};

export const objectMap = (object: Record<string, any>, mapFn: (key: string, value: any) => any) =>
  Object.keys(object).reduce(
    (acc, key) => assignKeyValue(acc, key, mapFn(key, object[key])),
    {} as Record<string, any>,
  );

export const sortedByGroup = <T extends Record<string, any>>(array: T[], key: string) =>
  groupBy(
    array
      .filter((item: T) => item[key])
      .sort((itemA: T, itemB: T) => itemA[key].localeCompare(itemB[key])),
    (item: T) => item[key],
  );

type DeepMappable = any[] | Record<string, any>

const isNonEmptyArray = (value: any) => R.is(Array, value) && value.length > 0;
const isNonArrayObject = (value: any) => R.is(Object, value) && !R.is(Array, value);
const isDeepMappable = (value: DeepMappable) => isNonEmptyArray(value) || isNonArrayObject(value);

export const deepMap = (transform: (arg: any) => any, object: DeepMappable): any =>
  R.map(
    (val: any) => isDeepMappable(val)
      ? deepMap(transform, val)
      : transform(val)
    , object
  );

export const cveRegex = /^CVE-(?:1999|2\d{3})-(?!0{4})(?:0\d{3}|[1-9]\d{3,})$/;
export const uniques = <T>(array: T[]) => Array.from(new Set(array));

export function formatDate(date: Date | string): string {
  const jsDate = new Date(date); // Handles strings in ISO/component format, and Date object
  return DateTime.fromJSDate(jsDate, { zone: 'utc' }).toFormat('yyyy-MM-dd T ZZZZ');
}
