import { CommentType } from '@/types';

export const SYSTEM_EMAIL = 'bugzilla@redhat.com';

export const CVSS_V3 = 'V3';
export const DEFAULT_CVSS_VERSION = CVSS_V3;

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

export const commentTooltips: Record<CommentType, string> = {
  [CommentType.Public]: 'Bugzilla Public - These comments are visible to everyone.',
  [CommentType.Private]: 'Bugzilla Private - These comments are visible to Red Hat associates.',
  [CommentType.Internal]: 'Jira Internal - These comments are visible to team members with required permissions.',
  [CommentType.System]: 'Bugzilla System - These are auto-generated private comments.',
};
