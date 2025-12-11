import { PackageURL } from 'packageurl-js';

export const validatePurl = (purl: null | string | undefined): null | string => {
  if (!purl) return null;
  try {
    PackageURL.fromString(purl);
    return null;
  } catch (e: any) {
    return e.message;
  }
};

export const validatePurlArray = (purls: string[] | undefined): null | string[] => {
  if (!purls?.length) return null;
  const errors = purls.map(validatePurl).filter((e): e is string => e !== null);
  return errors.length ? errors : null;
};
