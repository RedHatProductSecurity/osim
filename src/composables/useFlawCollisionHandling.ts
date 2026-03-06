import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import type { ZodFlawType } from '@/types';
import { useToastStore } from '@/stores/ToastStore';
import { getFlaw } from '@/services/FlawService';
import { osidbFetch } from '@/services/OsidbAuthService';

// Helper functions moved to outer scope for linting compliance
async function putFlawDirectly(uuid: string, flawObject: ZodFlawType, createJiraTask = false): Promise<ZodFlawType> {
  const beforeFetch = (ctx: any) => {
    if (ctx.options.method.toUpperCase() === 'PUT') {
      ctx.options.data.updated_dt = flawObject.updated_dt;
    }
  };

  const response = await osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/flaws/${uuid}`,
    data: flawObject,
    params: {
      ...(createJiraTask && { create_jira_task: true }),
    },
  }, { beforeFetch });

  return response.data;
}

type AegisFieldValue = null | string | string[] | undefined;

function getFieldValue(flaw: ZodFlawType, fieldName: string): AegisFieldValue {
  switch (fieldName) {
    case 'components': return flaw.components;
    case 'cve_description': return flaw.cve_description;
    case 'cvss3_vector': return flaw.cvss_scores?.[0]?.vector ?? null;
    case 'cwe_id': return flaw.cwe_id;
    case 'impact': return flaw.impact;
    case 'mitigation': return flaw.mitigation;
    case 'statement': return flaw.statement;
    case 'title': return flaw.title;
    default: return null;
  }
}

function setFieldValue(flaw: ZodFlawType, fieldName: string, value: AegisFieldValue): void {
  switch (fieldName) {
    case 'components': flaw.components = value as typeof flaw.components; break;
    case 'cve_description': flaw.cve_description = value as typeof flaw.cve_description; break;
    case 'cvss3_vector':
      if (flaw.cvss_scores?.[0]) {
        flaw.cvss_scores[0].vector = value as string;
      }
      break;
    case 'cwe_id': flaw.cwe_id = value as typeof flaw.cwe_id; break;
    case 'impact': flaw.impact = value as typeof flaw.impact; break;
    case 'mitigation': flaw.mitigation = value as typeof flaw.mitigation; break;
    case 'statement': flaw.statement = value as typeof flaw.statement; break;
    case 'title': flaw.title = value as typeof flaw.title; break;
  }
}

function isEqual(a: any, b: any): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

// Centralized list of supported fields
const SUPPORTED_FIELDS = [
  'title',
  'cve_description',
  'statement',
  'mitigation',
  'impact',
  'cwe_id',
  'components',
  'cvss3_vector',
];

function preserveUserChangesToNonBotFields(
  resolvedFlaw: ZodFlawType,
  userFlawData: ZodFlawType,
  botCollisionFields: string[],
): void {
  SUPPORTED_FIELDS
    .filter(fieldName => !botCollisionFields.includes(fieldName))
    .forEach((fieldName) => {
      const userValue = getFieldValue(userFlawData, fieldName);
      if (userValue != null) {
        setFieldValue(resolvedFlaw, fieldName, userValue);
      }
    });
}

export function useFlawCollisionHandling() {
  const { isFieldValueAIBot } = useAegisMetadataTracking();
  const { addToast } = useToastStore();

  async function handleMidAirCollision(
    uuid: string,
    userFlawData: ZodFlawType,
    createJiraTask: boolean,
    originalError: any,
  ): Promise<ZodFlawType> {
    try {
      // Step 1: Fetch fresh flaw data from OSIDB
      console.log('Fetching fresh flaw data after collision...');
      const freshFlaw = await getFlaw(uuid, true); // breakCache = true

      // Step 2: Detect which fields have bot changes using existing highlighting logic
      const botCollisionFields = detectBotCollisionFields(freshFlaw);

      if (botCollisionFields.length > 0) {
        console.log('Bot collision detected in fields:', botCollisionFields);
        // Step 3: Resolve field-by-field using highlighting logic
        return await resolveFieldLevelCollision(
          freshFlaw,
          userFlawData,
          botCollisionFields,
          createJiraTask,
        );
      } else {
        // Step 4: No bot changes detected - this is a human vs human collision
        console.log('Human vs human collision detected');
        throw originalError;
      }
    } catch (resolutionError) {
      console.error('Error during collision resolution:', resolutionError);
      // If our smart resolution fails, fall back to original error handling
      throw originalError;
    }
  }

  function detectBotCollisionFields(freshFlaw: ZodFlawType): string[] {
    return SUPPORTED_FIELDS.filter((fieldName) => {
      const value = getFieldValue(freshFlaw, fieldName);
      if (!value) return false;

      // Handle array fields (like components) by checking if isFieldValueAIBot works with arrays
      if (Array.isArray(value)) {
        return isFieldValueAIBot(fieldName, value as any);
      }

      return isFieldValueAIBot(fieldName, value as string);
    });
  }

  async function resolveFieldLevelCollision(
    freshFlaw: ZodFlawType,
    userFlawData: ZodFlawType,
    botCollisionFields: string[],
    createJiraTask: boolean,
  ): Promise<ZodFlawType> {
    // Start with fresh flaw data (includes all bot updates)
    const resolvedFlaw = { ...freshFlaw };

    // Track what we're doing for user notification
    const userOverrides: string[] = [];
    const botPreserved: string[] = [];

    // For each field that has bot changes, check if user also changed it
    botCollisionFields.forEach((fieldName) => {
      const userValue = getFieldValue(userFlawData, fieldName);
      const originalValue = getFieldValue(freshFlaw, fieldName); // This is the bot value

      // If user provided a value different from bot value, use user value
      if (userValue != null && !isEqual(userValue, originalValue)) {
        setFieldValue(resolvedFlaw, fieldName, userValue);
        userOverrides.push(fieldName);
      } else {
        // User didn't change this field, keep bot value
        botPreserved.push(fieldName);
      }
    });

    // Also preserve any user changes to non-bot fields
    preserveUserChangesToNonBotFields(resolvedFlaw, userFlawData, botCollisionFields);

    // Show informative message about what happened
    showCollisionResolutionMessage(userOverrides, botPreserved);

    // Retry save with resolved data (this should succeed now)
    console.log('Retrying save with resolved data...');
    return await putFlawDirectly(resolvedFlaw.uuid, resolvedFlaw, createJiraTask);
  }

  function showCollisionResolutionMessage(userOverrides: string[], botPreserved: string[]): void {
    let message = 'Mid-air collision resolved! ';

    if (userOverrides.length > 0 && botPreserved.length > 0) {
      message += `Your changes to ${userOverrides.join(', ')} were preserved. `
      + `AI updates to ${botPreserved.join(', ')} were kept.`;
    } else if (userOverrides.length > 0) {
      message += `Your changes to ${userOverrides.join(', ')} overrode AI suggestions.`;
    } else if (botPreserved.length > 0) {
      message += `AI updates to ${botPreserved.join(', ')} were applied.`;
    }

    addToast({
      title: 'Smart Merge Completed',
      body: message,
      css: 'success',
    });
  }

  return {
    handleMidAirCollision,
  };
}
