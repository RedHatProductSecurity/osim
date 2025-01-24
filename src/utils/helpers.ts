import { toRaw, isRef, isReactive, isProxy, ref, unref, type Ref, type UnwrapRef } from 'vue';

import { DateTime } from 'luxon';
import * as R from 'ramda';
import { watchOnce } from '@vueuse/core';

import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types';

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

export function formatDateWithTimezone(value: string) {
  return DateTime.fromISO(value, { setZone: true })
    .toFormat('yyyy-MM-dd HH:mm ZZZZ');
}

export function getSpecficCvssScore(scores: any[], issuer: string, version: string) {
  return scores.find(
    score => score.issuer === issuer && score.cvss_version === version,
  );
}

export function isCVSS3issuedByRH(score: ZodAffectCVSSType) {
  return score.issuer === IssuerEnum.Rh && score.cvss_version === CVSS_V3;
}

export function affectRhCvss3(affect: ZodAffectType) {
  return affect.cvss_scores.find(isCVSS3issuedByRH);
}

export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

type WithModuleComponent = {
  ps_component: string;
  ps_module: string;
  uuid?: null | string;
};

export function matchModuleComponent(first: WithModuleComponent, second: WithModuleComponent) {
  return (first.ps_component === second.ps_component && first.ps_module === second.ps_module);
}

export function doAffectsMatch(first: ZodAffectType, second: ZodAffectType) {
  const doUuidsMatch = first.uuid && second.uuid && (first.uuid === second.uuid);
  return doUuidsMatch || matchModuleComponent(first, second);
}

export function isAffectIn(affect: ZodAffectType, affects: ZodAffectType[]) {
  return Boolean(affects.find(affectToMatch => doAffectsMatch(affect, affectToMatch)));
}

export function matcherForAffect(affect: ZodAffectType) {
  return (affectToMatch: ZodAffectType) => doAffectsMatch(affect, affectToMatch);
}

export function watchedRef<T>(): [Ref<T | undefined>, Ref<boolean>];
export function watchedRef<T>(initialValue: T): [Ref<T>, Ref<boolean>];
export function watchedRef<T>(initialValue?: T): [Ref<(T | undefined) | (undefined | UnwrapRef<T>)>, Ref<boolean>] {
  const refValue = ref(initialValue);
  const hasChanged = ref(false);

  watchOnce(refValue, () => hasChanged.value = true);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - TODO: this throws an error on `yarn type-check` but IDE is happy with it
  return [refValue, hasChanged] as const;
}
