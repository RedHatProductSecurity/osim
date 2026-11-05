import { ref, readonly, computed } from 'vue';

import type { ZodFlawCVSSType, ZodFlawLabelType, ZodFlawType } from '@/types/zodFlaw';
import { deepCopyFromRaw, mergeBy, serializeWithExclude } from '@/utils/helpers';
import type { ZodAffectType } from '@/types';

const flaw = ref<ZodFlawType>(blankFlaw());
const initialFlaw = ref<ZodFlawType>(blankFlaw());
// Counts same-flaw model replacements (post-save syncs, refetches) so field
// state wiped by a resync can be restored. Navigation is not a resync.
const flawResyncCount = ref(0);

function resetFlaw() {
  flaw.value = blankFlaw();
  initialFlaw.value = blankFlaw();
}

type FlawDataType = RelatedDataType | ZodFlawType;
type RelatedDataType = ZodAffectType[] | ZodFlawCVSSType[] | ZodFlawLabelType[];
type FlawFieldsWithEndpoints = 'affects' | 'cvss_scores' | 'labels';
type WithUUID = { uuid: string }[];
function setFlaw(flawData: FlawDataType, key?: FlawFieldsWithEndpoints, replace: boolean = true) {
  const previousFlaw = flaw.value;
  if (!key) {
    flaw.value = flawData as ZodFlawType;
    if (flawData !== previousFlaw && previousFlaw.uuid && (flawData as ZodFlawType).uuid === previousFlaw.uuid) {
      flawResyncCount.value += 1;
    }
  } else if (!replace && Array.isArray(flawData)) {
    flaw.value[key] = mergeBy(flaw.value[key] as WithUUID, flawData as WithUUID, 'uuid') as any;
  } else {
    Object.assign(flaw.value, { [key]: flawData });
  }
  initialFlaw.value = deepCopyFromRaw(flaw.value);
}

/**
 * Applies a background-loaded field (affects, audit history) to the flaw model
 * and the save baseline. Unlike setFlaw(), the baseline of unrelated fields is
 * preserved so edits made while the field was still loading (e.g. AI suggestions)
 * keep the flaw marked as updated and are not silently skipped on save.
 */
function setLateFlawField(key: 'affects' | 'history', value: unknown[]) {
  (flaw.value as any)[key] = value;
  (initialFlaw.value as any)[key] = deepCopyFromRaw(value as any);
}

// Update only server-owned affect fields; setFlaw would reset the baseline for unrelated dirty flaw edits.
function syncLinkedAffect(
  loadedFlaw: ZodFlawType, affectUuid: string, tracker: ZodAffectType['tracker'], updatedDt?: null | string,
) {
  if (flaw.value !== loadedFlaw || initialFlaw.value.uuid !== loadedFlaw.uuid) return;
  for (const snapshot of [flaw.value, initialFlaw.value]) {
    snapshot.affects = snapshot.affects.map(affect => affect.uuid === affectUuid
      ? { ...affect, tracker, ...(updatedDt ? { updated_dt: updatedDt } : {}) }
      : affect);
  }
  // Tracker updates may synchronously save the related flaw (and advance its updated_dt).
  // No flaw fetch here: later flaw PUTs may need a reload on 409 rather than a guessed timestamp.
}

const isFlawUpdated = computed(
  () => {
    const keysToExclude: Array<keyof ZodFlawType> = ['affects', 'trackers', 'cvss_scores'];
    return serializeWithExclude(flaw.value, keysToExclude)
      !== serializeWithExclude(initialFlaw.value, keysToExclude);
  },
);

export function useFlaw() {
  return {
    flaw,
    flawResyncCount: readonly(flawResyncCount),
    initialFlaw: readonly(initialFlaw),
    isFlawUpdated,
    resetFlaw,
    setFlaw,
    setLateFlawField,
    syncLinkedAffect,
  };
}

export function blankFlaw(): ZodFlawType {
  return {
    affects: [],
    classification: {
      state: 'NEW',
      workflow: '',
    },
    components: [],
    unembargo_dt: null,
    reported_dt: new Date().toISOString(),
    uuid: '',
    cve_id: '',
    cvss_scores: [],
    cwe_id: '',
    comment_zero: '',
    embargoed: false,
    impact: null,
    major_incident_state: '',
    source: '',
    title: '',
    owner: '',
    team_id: '',
    cve_description: '',
    statement: '',
    mitigation: '',
    task_key: '',
    comments: [],
    labels: [],
    references: [],
    acknowledgments: [],
    alerts: [],
  };
}
