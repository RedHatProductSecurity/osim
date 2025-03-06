export enum CommentType {
  Public,
  Private,
  Internal,
  System,
}

export const SYSTEM_EMAIL = 'bugzilla@redhat.com';

export const CVSS_V3 = 'V3';
export const CVSS_V4 = 'V4';
export const DEFAULT_CVSS_VERSION = CVSS_V4;

export const allowedSources = [
  '',
  'ADOBE',
  'APPLE',
  'BUGTRAQ',
  'CERT',
  'CUSTOMER',
  'CVE',
  'DEBIAN',
  'DISTROS',
  'GENTOO',
  'GIT',
  'GOOGLE',
  'HW_VENDOR',
  'INTERNET',
  'LKML',
  'MAGEIA',
  'MOZILLA',
  'NVD',
  'OPENSSL',
  'ORACLE',
  'OSSSECURITY',
  'OSV',
  'REDHAT',
  'RESEARCHER',
  'SECUNIA',
  'SKO',
  'SUSE',
  'TWITTER',
  'UBUNTU',
  'UPSTREAM',
];
