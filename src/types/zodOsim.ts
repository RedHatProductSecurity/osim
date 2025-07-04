import { z } from 'zod';

export const enum OsimRuntimeStatus {
  INIT,
  READY,
  ERROR,
};

export const OsimRuntime = z.object({
  env: z.string().default(''),
  backends: z.object({
    osidb: z.string(),
    osidbAuth: z.string().default('kerberos'),
    bugzilla: z.string(),
    jira: z.string(),
    errata: z.string(),
    jiraDisplay: z.string(),
    mitre: z.string(),
  }),
  osimVersion: z.object({
    rev: z.string(),
    tag: z.string(),
    timestamp: z.string(),
  }),
  error: z.string().default(''),
  readOnly: z.boolean().default(false),
});
export type OsimRuntimeType = z.infer<typeof OsimRuntime>;

export const OsidbHealthy = z.object({
  env: z.string(),
  revision: z.string(),
  version: z.string(),
});
export type OsidbHealthyType = z.infer<typeof OsidbHealthy>;
