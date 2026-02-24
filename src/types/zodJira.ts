import { z } from 'zod';

export type ZodJiraUserAssignableType = z.infer<typeof JiraUserAssignableSchema>;
export const JiraUserAssignableSchema = z.object({
  accountId: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  avatarUrls: z.record(z.string()).optional(),
  displayName: z.string(),
  emailAddress: z.string().email().optional(),
  name: z.string().optional(),
});

export type ZodJiraContributorType = z.infer<typeof JiraContributorSchema>;
export const JiraContributorSchema = z.object({
  accountId: z.string().optional(),
  displayName: z.string(),
  emailAddress: z.string().email().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  self: z.string().url().optional(),
});

export type ZodJiraIssueType = z.infer<typeof JiraIssueSchema>;
export const JiraIssueSchema = z.object({
  id: z.string(),
  self: z.string().url(),
  key: z.string(),
  // fields uses passthrough so any custom field ID can be accessed at runtime
  fields: z.record(z.unknown()),
});
