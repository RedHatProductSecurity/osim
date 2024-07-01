import { z } from 'zod';

export type ZodJiraUserPickerType = z.infer<typeof JiraUserPickerSchema>;
export const JiraUserPickerSchema = z.object({
  displayName: z.string(),
  html: z.string(),
  name: z.string(),
});


export type ZodJiraContributorType = z.infer<typeof JiraContributorSchema>;
export const JiraContributorSchema = z.object({
  self: z.string().url(),
  name: z.string(),
  key: z.string().optional(),
  displayName: z.string(),
  emailAddress: z.string().email(),
});

export type ZodJiraIssueType = z.infer<typeof JiraIssueSchema>;
export const JiraIssueSchema = z.object({
  id: z.string(),
  self: z.string().url(),
  key: z.string(),
  fields:z.object({
    customfield_12315950: z.array(JiraContributorSchema),
  }).passthrough()
});
