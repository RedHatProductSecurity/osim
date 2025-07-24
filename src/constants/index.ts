import { IssuerEnum } from '@/generated-client';
import type { Dict } from '@/types';

export const SYSTEM_EMAIL = 'bugzilla@redhat.com';

export enum CvssVersions {
  V3 = 'V3',
  V4 = 'V4',
}

export const CVSS_V3 = CvssVersions.V3;
export const CVSS_V4 = CvssVersions.V4;

export const isCvss4Enabled = false;

export const CvssVersionDisplayMap: { [_key in CvssVersions]: string } = {
  [CvssVersions.V3]: '3.1',
  [CvssVersions.V4]: '4.0',
};

export const CorrespondingCvssFactors: Dict = {
  AV: 'AV',
  AC: 'AC',
  PR: 'PR',
  UI: 'UI',
  // S: 'S',
  // CVSS 3 to 4
  C: 'VC',
  I: 'VI',
  A: 'VA',
  // CVSS 4 to 3
  VC: 'C',
  VI: 'I',
  VA: 'A',
};

export const DEFAULT_CVSS_VERSION = CvssVersions.V3;

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

export enum CommentType {
  Public,
  Private,
  Internal,
  System,
}

export const commentTooltips: Record<CommentType, string> = {
  [CommentType.Public]: 'Bugzilla Public - These comments are visible to everyone.',
  [CommentType.Private]: 'Bugzilla Private - These comments are visible to Red Hat associates.',
  [CommentType.Internal]: 'Jira Internal - These comments are visible to team members with required permissions.',
  [CommentType.System]: 'Bugzilla System - These are auto-generated private comments.',
};

export const issuerLabels: Record<string, string> = {
  [IssuerEnum.Nist]: 'NVD',
  [IssuerEnum.Rh]: 'RH',
  [IssuerEnum.Cveorg]: 'CVEOrg',
  [IssuerEnum.Osv]: 'OSV',
  [IssuerEnum.Cisa]: 'CISA',
};
