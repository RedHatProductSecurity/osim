import { z } from 'zod';

const JiraUserBaseSchema = z.object({
  displayName: z.string(),
  name: z.string().nullish(),             // On-premise; null on Cloud
  accountId: z.string().optional(),       // Jira Cloud; never null, absent for on-prem users
  emailAddress: z.string().email().nullish(), // null when user has hidden their email
});

export type ZodJiraUserAssignableType = z.infer<typeof JiraUserAssignableSchema>;
export const JiraUserAssignableSchema = JiraUserBaseSchema.extend({
  avatarUrl: z.string().url().nullish(),
  avatarUrls: z.record(z.string()).nullish(), // Jira Cloud returns avatarUrls object
});

export type ZodJiraContributorType = z.infer<typeof JiraContributorSchema>;
export const JiraContributorSchema = JiraUserBaseSchema.extend({
  self: z.string().url(),
  key: z.string().nullish(),
});

export type ZodJiraIssueType = z.infer<typeof JiraIssueSchema>;
export const JiraIssueSchema = z.object({
  id: z.string(),
  self: z.string().url(),
  key: z.string(),
  // fields uses passthrough so any custom field ID can be accessed at runtime
  fields: z.record(z.unknown()),
});
