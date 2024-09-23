import { toRaw, isRef, isReactive, isProxy, ref, toRef, watch, unref } from 'vue';

import { DateTime } from 'luxon';
import * as R from 'ramda';

import { CVSS_V3 } from '@/constants';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types';

export function watchedPropRef(prop: Record<string, any>, property: string, defaultValue: any) {
  const reffedProp = toRef(prop, property);
  const flexRef = reffedProp.value === undefined ? ref(defaultValue) : reffedProp;
  watch(reffedProp, value => flexRef.value = value);
  return flexRef;
}

export function unwrap(value: any): any {
  const unwrapped = toRaw(unref(value));
  return isUnwrappable(unwrapped) ? unwrap(unwrapped) : unwrapped;
}

function isUnwrappable(value: any) {
  return isRef(value) || isReactive(value) || isProxy(value);
}

export function deepCopyFromRaw<T extends Record<string, any>>(sourceObj: T): T {
  const objectIterator = (input: any): any => {
    if (isUnwrappable(input)) {
      return objectIterator(unwrap(input));
    }

    if (Array.isArray(input)) {
      return input.map(item => objectIterator(item));
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

type DeepMappable = any[] | Record<string, any>;

const isNonEmptyArray = (value: any) => R.is(Array, value) && value.length > 0;
const isNonArrayObject = (value: any) => R.is(Object, value) && !R.is(Array, value);
const isDeepMappable = (value: DeepMappable) => isNonEmptyArray(value) || isNonArrayObject(value);

export const deepMap = (transform: (arg: any) => any, object: DeepMappable): any =>
  R.map(
    (val: any) => isDeepMappable(val)
      ? deepMap(transform, val)
      : transform(val)
    , object,
  );

export const cveRegex = /^CVE-(?:1999|2\d{3})-(?!0{4})(?:0\d{3}|[1-9]\d{3,})$/;

export const isCveValid = (cve: string) => cveRegex.test(cve);

export const uniques = <T>(array: T[]) => Array.from(new Set(array));

export function formatDate(date: Date | string, includeTime: boolean): string {
  const format = includeTime ? 'yyyy-MM-dd T ZZZZ' : 'yyyy-MM-dd';
  const jsDate = new Date(date); // Handles strings in ISO/component format, and Date object
  return DateTime.fromJSDate(jsDate, { zone: 'utc' }).toFormat(format);
}

export function isCVSS3issuedByRH(score: ZodAffectCVSSType) {
  return score.issuer === 'RH' && score.cvss_version === CVSS_V3;
}

export function affectRhCvss3(affect: ZodAffectType) {
  return affect.cvss_scores.find(isCVSS3issuedByRH);
}

type WithModuleComponent = {
  ps_component: string;
  ps_module: string;
  uuid?: null | string;
};

export function matchModuleComponent(first: WithModuleComponent, second: WithModuleComponent) {
  return first.ps_component === second.ps_component && first.ps_module === second.ps_module;
}

export function doAffectsMatch(first: ZodAffectType, second: ZodAffectType) {
  return (first.uuid === second.uuid) || matchModuleComponent(first, second);
}

export function isAffectIn(affect: ZodAffectType, affects: ZodAffectType[]) {
  return Boolean(
    affects.find(affectToMatch => doAffectsMatch(affect, affectToMatch)),
  );
}

export function affectsMatcherFor(affect: ZodAffectType) {
  return (affectToMatch: ZodAffectType) => doAffectsMatch(affect, affectToMatch);
}
