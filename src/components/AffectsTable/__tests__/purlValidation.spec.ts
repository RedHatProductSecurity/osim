import { describe, it, expect } from 'vitest';

import { validatePurl, validatePurlArray } from '../purlValidation';

describe('purl validation', () => {
  describe('validatePurl', () => {
    it('should return null for empty/null/undefined values', () => {
      expect(validatePurl(null)).toBeNull();
      expect(validatePurl(undefined)).toBeNull();
      expect(validatePurl('')).toBeNull();
    });

    it('should return null for valid PURLs', () => {
      expect(validatePurl('pkg:rpm/redhat/kernel@5.14.0')).toBeNull();
      expect(validatePurl('pkg:npm/@scope/package@1.0.0')).toBeNull();
      expect(validatePurl('pkg:pypi/requests@2.28.0')).toBeNull();
      expect(validatePurl('pkg:maven/org.apache/commons@1.0')).toBeNull();
      expect(validatePurl('pkg:golang/github.com/example/repo@v1.0.0')).toBeNull();
    });

    it('should return null for valid PURLs with qualifiers', () => {
      expect(validatePurl('pkg:rpm/redhat/kernel@5.14.0?arch=x86_64')).toBeNull();
      expect(validatePurl('pkg:rpm/redhat/kernel@5.14.0?arch=x86_64&distro=rhel-9')).toBeNull();
    });

    it('should return null for valid PURLs without version', () => {
      expect(validatePurl('pkg:rpm/redhat/kernel')).toBeNull();
      expect(validatePurl('pkg:npm/lodash')).toBeNull();
    });

    it('should return error message for invalid PURLs', () => {
      expect(validatePurl('not-a-purl')).not.toBeNull();
      expect(validatePurl('invalid')).not.toBeNull();
      expect(validatePurl('pkg:')).not.toBeNull();
      expect(validatePurl('pkg:unknown')).not.toBeNull();
    });

    it('should return error message for malformed PURLs', () => {
      const error = validatePurl('pkg:');
      expect(error).toBeTypeOf('string');
      expect(error!.length).toBeGreaterThan(0);
    });
  });

  describe('validatePurlArray', () => {
    it('should return null for empty/undefined arrays', () => {
      expect(validatePurlArray(undefined)).toBeNull();
      expect(validatePurlArray([])).toBeNull();
    });

    it('should return null when all PURLs are valid', () => {
      expect(validatePurlArray([
        'pkg:rpm/redhat/kernel@5.14.0',
        'pkg:npm/lodash@4.17.21',
      ])).toBeNull();
    });

    it('should return null for array with empty strings', () => {
      expect(validatePurlArray([''])).toBeNull();
      expect(validatePurlArray(['', ''])).toBeNull();
    });

    it('should return errors array when some PURLs are invalid', () => {
      const errors = validatePurlArray([
        'pkg:rpm/redhat/kernel@5.14.0',
        'invalid-purl',
      ]);
      expect(errors).not.toBeNull();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors!.length).toBe(1);
    });

    it('should return multiple errors when multiple PURLs are invalid', () => {
      const errors = validatePurlArray([
        'invalid-purl-1',
        'pkg:rpm/redhat/kernel@5.14.0',
        'invalid-purl-2',
      ]);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBe(2);
    });

    it('should return errors for all invalid PURLs in array', () => {
      const errors = validatePurlArray([
        'not-valid',
        'also-not-valid',
        'still-not-valid',
      ]);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBe(3);
    });
  });
});
