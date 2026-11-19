import { shallowRef } from 'vue';

import type { CvssFieldConflict, CvssRebaseField, CvssScoreSnapshot } from '@/utils/cvssRebase';

export type PendingCvssScore = {
  /** Set for an affect score. A flaw score leaves this empty. */
  affectUuid?: string;
  formEdits: CvssRebaseField[];
  issuer?: null | string;
  local: CvssScoreSnapshot;
  scope: string;
  server?: CvssScoreSnapshot;
  version?: null | string;
};

export type PendingCvssConflict = {
  conflicts: CvssFieldConflict[];
  scores: PendingCvssScore[];
};

export const pendingCvssConflict = shallowRef<null | PendingCvssConflict>(null);

export function clearCvssConflict() {
  pendingCvssConflict.value = null;
}

export function recordCvssConflict(score: PendingCvssScore, conflicts: CvssFieldConflict[]) {
  const current = pendingCvssConflict.value ?? { conflicts: [], scores: [] };
  pendingCvssConflict.value = {
    conflicts: [...current.conflicts, ...conflicts],
    scores: [...current.scores.filter(row => row.scope !== score.scope), score],
  };
}
