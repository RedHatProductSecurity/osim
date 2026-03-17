import { DateTime } from 'luxon';

import { FlawClassificationStateEnum } from '@/generated-client';
import type { ZodFlawType } from '@/types';
import { isCveValid } from '@/utils/helpers';

function areRequiredFieldsEmpty(flaw: ZodFlawType): boolean {
  if (flaw.aegis_meta?.processed === true) return false;

  return !(
    (flaw.affects && flaw.affects.length > 0)
    || (flaw.owner && flaw.owner.trim().length > 0)
    || (flaw.cve_description && flaw.cve_description.trim().length > 0)
    || (flaw.statement && flaw.statement.trim().length > 0)
    || (flaw.mitigation && flaw.mitigation.trim().length > 0)
    || (flaw.cwe_id && flaw.cwe_id.trim().length > 0)
    || (flaw.cvss_scores && flaw.cvss_scores.some(score => score.issuer === 'RH'))
  );
}

/**
 * Composable to detect flaws that are pending bot processing
 *
 * A flaw is considered pending bot processing if:
 * 1. It's in NEW/empty state
 * 2. It has a valid CVE ID assigned
 * 3. It's newer than the processing threshold (24 hours or less)
 * 4. Processed meta false
 * 5. Fields are empty:
 */
export function useUnprocessedFlawDetection() {
  const PROCESSING_THRESHOLD_HOURS = 24;

  function isOlderThanThreshold(createdDt: null | string | undefined): boolean {
    if (!createdDt) return false;

    const createdDate = DateTime.fromISO(createdDt);
    const thresholdDate = DateTime.now().minus({ hours: PROCESSING_THRESHOLD_HOURS });

    return createdDate < thresholdDate;
  }

  function isFlawUnprocessed(flaw: ZodFlawType): boolean {
    return (flaw.classification?.state === FlawClassificationStateEnum.New
      || flaw.classification?.state === FlawClassificationStateEnum.Empty)
      && !!flaw.cve_id && isCveValid(flaw.cve_id)
      && !isOlderThanThreshold(flaw.created_dt)
      && areRequiredFieldsEmpty(flaw);
  }

  return {
    isFlawUnprocessed,
    PROCESSING_THRESHOLD_HOURS,
  };
}
