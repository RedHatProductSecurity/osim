<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { Table } from '@tanstack/vue-table';

import { useAffectsModel } from '@/composables/useAffectsModel';
import { useFlaw } from '@/composables/useFlaw';

import { parseOsidbErrors } from '@/services/osidb-errors-helpers';
import { parseTrackerId } from '@/services/TrackerService';
import { useToastStore } from '@/stores/ToastStore';
import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodAffectType } from '@/types';
import Modal from '@/widgets/Modal/Modal.vue';

const props = defineProps<{
  affect: ZodAffectType;
  flawUuid: string;
  rowId: string;
  table: Table<ZodAffectType>;
}>();

const emit = defineEmits<{ close: [] }>();

// Keep the operation bound to the row/flaw that opened this dialog, even if navigation reuses it.
const affect = props.affect;
const rowId = props.rowId;
const flawUuid = props.flawUuid;
const filingTracker = props.table.options.meta!.filingTracker;
const externalId = ref('');
const validationError = ref('');
const isSubmitting = ref(false);
const input = ref<HTMLInputElement>();
let mounted = true;

const { flaw } = useFlaw();
const { actions: { linkExistingTracker }, state: { modifiedAffects, newAffects, removedAffects } } = useAffectsModel();
const flawLabel = computed(() => flawUuid === flaw.value.uuid
  ? flaw.value.cve_id || flawUuid
  : flawUuid);

onMounted(() => nextTick(() => input.value?.focus()));
watch(() => flaw.value.uuid, (uuid) => {
  if (uuid !== flawUuid) emit('close');
});
onBeforeUnmount(() => {
  mounted = false;
});

function close() {
  if (!isSubmitting.value) emit('close');
}

function trapFocus(event: KeyboardEvent) {
  const dialog = event.currentTarget as HTMLElement;
  const controls = dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || (event.shiftKey && document.activeElement === first)
    || (!event.shiftKey && document.activeElement === last) || document.activeElement === dialog) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}

function errorMessage(error: any): string {
  const status = error?.response?.status;
  if (status === 409) return 'The tracker or affect changed while linking. Reload and try again.';
  if (status === 403 || status === 404) {
    return 'Tracker or affect not found or inaccessible. Check the ID and your access.';
  }
  if (error instanceof Error) return error.message;
  if (Array.isArray(error) || error?.response || error?.request) {
    return parseOsidbErrors(Array.isArray(error) ? error : [error]);
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function submit() {
  validationError.value = '';
  if (isSubmitting.value || filingTracker.has(rowId)) return;

  const parsed = parseTrackerId(externalId.value);
  if (!parsed) {
    validationError.value = 'Enter a Jira key (e.g. RHSA-1234) or a positive Bugzilla ID (e.g. 123456).';
    return;
  }
  if (osimRuntime.value.readOnly) {
    validationError.value = 'Linking trackers is unavailable in read-only mode.';
    return;
  }
  if (flaw.value.uuid !== flawUuid) {
    emit('close');
    return;
  }
  if (!affect.uuid || newAffects.has(rowId) || modifiedAffects.has(rowId) || removedAffects.has(rowId)) {
    validationError.value = 'Save or revert affect changes before linking a tracker.';
    return;
  }
  if (affect.tracker) {
    validationError.value = 'This affect already has a tracker.';
    return;
  }

  isSubmitting.value = true;
  nextTick(() => input.value?.closest<HTMLElement>('.modal-dialog')?.focus());
  filingTracker.add(rowId);
  try {
    const { refreshFailed } = await linkExistingTracker(affect, parsed.external_system_id);
    if (flaw.value.uuid === flawUuid) {
      useToastStore().addToast({
        title: refreshFailed ? 'Tracker linked; refresh failed' : 'Tracker linked',
        body: refreshFailed
          ? `${parsed.external_system_id} linked to ${flawLabel.value}, but refresh failed. Reload to verify.`
          : `${parsed.external_system_id} linked to ${flawLabel.value}.`,
        css: refreshFailed ? 'warning' : 'success',
      });
      if (mounted) emit('close');
    }
  } catch (error) {
    if (mounted && flaw.value.uuid === flawUuid) {
      useToastStore().addToast({
        title: 'Failed to link tracker',
        body: errorMessage(error),
        css: 'warning',
      });
    }
  } finally {
    filingTracker.delete(rowId);
    isSubmitting.value = false;
    if (mounted) nextTick(() => input.value?.focus());
  }
}
</script>

<template>
  <Teleport to="body">
    <Modal
      :show="true"
      class="link-existing-tracker-dialog"
      @close="close"
      @keydown.esc.stop.prevent="close"
      @keydown.tab="trapFocus"
    >
      <template #header>
        <h2 id="modalTitle" class="modal-title fs-5">Link existing tracker</h2>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          :disabled="isSubmitting"
          @click="close"
        ></button>
      </template>
      <template #body>
        <dl class="row mb-3">
          <dt class="col-sm-3">Target flaw</dt>
          <dd class="col-sm-9">{{ flawLabel }}</dd>
          <dt class="col-sm-3">Update stream</dt>
          <dd class="col-sm-9">{{ affect.ps_update_stream || '—' }}</dd>
          <dt class="col-sm-3">Component</dt>
          <dd class="col-sm-9">{{ affect.ps_component || '—' }}</dd>
        </dl>
        <label for="existing-tracker-id" class="form-label">External tracker ID</label>
        <input
          id="existing-tracker-id"
          ref="input"
          v-model="externalId"
          class="form-control"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :aria-invalid="!!validationError"
          aria-describedby="existing-tracker-help"
          :disabled="isSubmitting"
          @input="validationError = ''"
          @keydown.enter.prevent="submit"
        >
        <div id="existing-tracker-help" class="form-text">
          Enter a Jira key such as RHSA-1234 or a positive Bugzilla ID such as 123456.
          The tracker must apply to this affect's update stream and component.
        </div>
        <div v-if="validationError" class="text-danger mt-2" role="alert">{{ validationError }}</div>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="isSubmitting"
          @click="close"
        >
          Cancel
        </button>
        <button
          v-osim-loading="isSubmitting"
          type="button"
          class="btn btn-primary"
          :disabled="isSubmitting || !externalId.trim()"
          @click="submit"
        >
          Link tracker
        </button>
      </template>
    </Modal>
  </Teleport>
</template>
