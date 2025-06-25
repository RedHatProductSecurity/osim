<script setup lang="ts">
import { computed, toRefs, watch } from 'vue';

import { storeToRefs } from 'pinia';
import { PackageURL } from 'packageurl-js';

import CvssCalculatorOverlayed from '@/components/CvssCalculator/CvssCalculatorOverlayed.vue';

import {
  affectImpacts,
  affectAffectedness,
  possibleAffectResolutions,
  affectJustification,
  type ZodAffectType,
} from '@/types/zodAffect';
import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import { matcherForAffect } from '@/utils/helpers';
import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';

const props = defineProps<{
  affect: ZodAffectType;
  error: null | Record<string, any>;
  isLast: boolean;
  isModified: boolean;
  isNew: boolean;
  isRemoved: boolean;
}>();

const emit = defineEmits<{
  'affect:recover': [value: ZodAffectType];
  'affect:remove': [value: ZodAffectType];
  'affect:toggle-selection': [value: ZodAffectType];
  'affect:track': [value: ZodAffectType];
  'affect:updateCvss': [affect: ZodAffectType, newVector: string, newScore: null | number, cvssScoreIndex: number];
}>();

const affectsEditingStore = useAffectsEditingStore();
const {
  cancelChanges,
  commitChanges,
  editAffect,
  isAffectSelected,
  isBeingEdited,
  isSelectable,
  revertAffectToLastSaved,
} = affectsEditingStore;
const { affectsBeingEdited } = storeToRefs(affectsEditingStore);

const { affect } = toRefs(props);

watch(affect, (newAffect) => {
  if (isBeingEdited(affect.value)) {
    const filter = matcherForAffect(affect.value);
    const index = affectsBeingEdited.value.findIndex(filter);
    if (index !== -1) {
      affectsBeingEdited.value[index] = newAffect;
    }
  }
});

const handleKeystroke = (event: KeyboardEvent, affect: ZodAffectType) => {
  if (event.key === 'Escape') {
    cancelChanges(affect);
  } else if (event.key === 'Enter') {
    commitChanges(affect);
  }
};

// Select Affects

function componentFromPurl(purl: string) {
  try {
    return PackageURL.fromString(purl)?.name ?? null;
  } catch (error) {
    return null;
  }
}

function handleToggle(affect: ZodAffectType) {
  if (isSelectable(affect)) {
    emit('affect:toggle-selection', affect);
  }
}

function revertChanges(affect: ZodAffectType) {
  revertAffectToLastSaved(affect);
  if (isAffectSelected(affect)) {
    handleToggle(affect);
  }
}

function affectCvss(affect: ZodAffectType) {
  return affect.cvss_scores.find(({ cvss_version, issuer }) => issuer === IssuerEnum.Rh && cvss_version === CVSS_V3);
}

function resolutionOptions(affect: ZodAffectType) {
  return affect?.affectedness
    ? possibleAffectResolutions[affect.affectedness]
    : [];
}
const affectRowTooltip = computed(() => {
  if (props.isRemoved) {
    return 'This affect will be deleted on save changes';
  } else if (props.isNew) {
    return 'This affect will be created on save changes';
  } else if (props.isModified) {
    return 'This affect will be updated on save changes';
  } else {
    return '';
  }
});

function affectednessChange(event: Event, affect: ZodAffectType) {
  const selectElement = event.target as HTMLSelectElement;
  const selectedValue = selectElement.value;
  if (selectedValue === 'NOTAFFECTED') {
    affect.delegated_resolution = '';
    affect.resolution = '';
  } else {
    affect.not_affected_justification = '';
  }
}
</script>

<template>
  <tr
    v-if="affect"
    :class="{
      'border-bottom border-gray': isLast,
      'editing': isBeingEdited(affect),
      'modified': isModified && !isBeingEdited(affect),
      'new': isNew && !isBeingEdited(affect),
      'removed': isRemoved,
      'selected': isAffectSelected(affect) }"
    :style="isSelectable(affect) ? 'cursor: pointer' : ''"
    :title="affectRowTooltip"
    @click.prevent="handleToggle(affect)"
  >
    <td>
      <i class="row-left-indicator bi bi-caret-right-fill fs-4" />
      <input
        type="checkbox"
        class="form-check-input"
        :checked="isAffectSelected(affect)"
        :disabled="isBeingEdited(affect) || isRemoved"
        @click.stop="handleToggle(affect)"
      />
    </td>
    <td>
      <i
        v-if="isBeingEdited(affect)"
        class="bi bi-pencil"
        title="This affect is currently being edited"
      />
      <i
        v-else-if="isNew"
        class="bi bi-plus-lg"
        title="This affect is set for creation on save"
      />
      <i
        v-else-if="isModified"
        class="bi bi-file-earmark-diff"
        title="This affect has modifications to save"
      />
      <i
        v-else-if="isRemoved"
        class="bi bi-trash"
        title="This affect is set for deletion on save"
      />
      <i v-else class="bi bi-database-check" title="This affect is saved" />
    </td>
    <td>
      <input
        v-if="isBeingEdited(affect)"
        v-model="affect.ps_module"
        class="form-control"
        @keydown="handleKeystroke($event, affect)"
      />
      <span v-else :title="affect.ps_module">
        {{ affect.ps_module }}
      </span>
    </td>
    <td v-if="!affect.purl">
      <input
        v-if="isBeingEdited(affect)"
        v-model="affect.ps_component"
        class="form-control"
        @keydown="handleKeystroke($event, affect)"
      />
      <span v-else :title="affect.ps_component">
        {{ affect.ps_component }}
      </span>
    </td>
    <td v-if="affect.purl">
      <span :title="componentFromPurl(affect.purl) ?? ''">
        {{ componentFromPurl(affect.purl) }}
      </span>
    </td>
    <td>
      <input
        v-if="isBeingEdited(affect)"
        v-model="affect.purl"
        class="form-control"
        :class="{ 'is-invalid': error?.purl }"
        :title="error?.purl ?? null"
        @keydown="handleKeystroke($event, affect)"
      />
      <span
        v-else
        :title="affect.purl || ''"
      >
        {{ affect.purl }}
      </span>
      <span v-if="error?.purl" class="invalid-feedback d-block text-wrap affect-field-error">
        {{ error?.purl }}
      </span>
    </td>
    <td>
      <select
        v-if="isBeingEdited(affect)"
        v-model="affect.affectedness"
        class="form-select"
        @keydown="handleKeystroke($event, affect)"
        @change="affectednessChange($event, affect)"
      >
        <option
          v-for="affectedness in affectAffectedness"
          :key="affectedness"
          :value="affectedness"
          :selected="affectedness === affect.affectedness"
        >
          {{ affectedness }}
        </option>
      </select>
      <span v-else>
        {{ affect.affectedness }}
      </span>
    </td>

    <td>
      <select
        v-if="isBeingEdited(affect)"
        v-model="affect.not_affected_justification"
        class="form-select"
        :disabled="affect.affectedness !== 'NOTAFFECTED'"
        @keydown="handleKeystroke($event, affect)"
      >
        <option
          v-for="justification in affectJustification"
          :key="justification"
          :value="justification"
          :selected="justification === affect.not_affected_justification"
        >
          {{ justification }}
        </option>
      </select>
      <span v-else :title="affect.not_affected_justification ?? ''">
        {{ affect.not_affected_justification }}
      </span>
    </td>
    <td>
      <select
        v-if="isBeingEdited(affect)"
        v-model="affect.resolution"
        class="form-select"
        @keydown="handleKeystroke($event, affect)"
      >
        <option
          v-for="resolution in resolutionOptions(affect)"
          :key="resolution"
          :value="resolution"
          :selected="resolution === affect.resolution"
        >
          {{ resolution }}
        </option>
      </select>
      <span v-else>
        {{ affect.resolution }}
      </span>
    </td>
    <td>
      <select
        v-if="isBeingEdited(affect)"
        v-model="affect.impact"
        class="form-select"
        @keydown="handleKeystroke($event, affect)"
      >
        <option
          v-for="impact in affectImpacts"
          :key="impact"
          :value="impact"
          :selected="impact === affect.impact"
        >
          {{ impact }}
        </option>
      </select>
      <span v-else>
        {{ affect.impact }}
      </span>
    </td>
    <td>
      <CvssCalculatorOverlayed
        v-if="isBeingEdited(affect)"
        :cvssVector="affectCvss(affect)?.vector"
        :cvssScore="affectCvss(affect)?.score"
        @updateAffectCvss="(vectorValue, scoreValue) => emit(
          'affect:updateCvss',
          affect,
          vectorValue,
          scoreValue,
          affect.cvss_scores.findIndex(cvss => cvss.uuid == affectCvss(affect)?.uuid)
        )"
      />
      <span v-else :title="affectCvss(affect)?.vector || ''">
        {{ affectCvss(affect)?.score || '' }}
      </span>
    </td>
    <td>
      <div class="affect-tracker-cell">
        <span class="me-2 my-auto">{{ affect.trackers.length }}</span>
        <button
          v-if="!(isBeingEdited(affect) || isRemoved)"
          type="button"
          class="btn btn-sm px-1 py-0 d-flex rounded-circle"
          @click.prevent.stop="emit('affect:track', affect)"
        >
          <i class="bi bi-plus lh-sm m-auto" />
        </button>
      </div>
    </td>
    <td>
      <button
        v-if="!isBeingEdited(affect) && !isRemoved"
        type="button"
        class="btn btn-sm"
        title="Edit affect"
        tabindex="-1"
        @click.stop="editAffect(affect)"
      >
        <i class="bi bi-pencil" />
      </button>
      <button
        v-if="isBeingEdited(affect) && !isRemoved"
        type="button"
        class="btn btn-sm"
        title="Commit edit"
        tabindex="-1"
        @click.stop="commitChanges(affect)"
      >
        <i class="bi bi-check2 fs-5 lh-sm" />
      </button>
      <button
        v-if="!isBeingEdited(affect) && !isRemoved"
        type="button"
        class="btn btn-sm"
        title="Remove affect"
        tabindex="-1"
        @click.stop="emit('affect:remove', affect)"
      >
        <i class="bi bi-trash" />
      </button>
      <button
        v-if="isBeingEdited(affect) && !isRemoved && !isNew"
        type="button"
        class="btn btn-sm"
        title="Cancel edit"
        tabindex="-1"
        @click.stop="cancelChanges(affect)"
      >
        <i class="bi bi-x fs-5 lh-sm" />
      </button>
      <button
        v-if="isRemoved"
        type="button"
        class="btn btn-sm recover-btn"
        title="Recover affect"
        tabindex="-1"
        @click.stop="emit('affect:recover', affect)"
      >
        <i class="bi-arrow-counterclockwise fs-5 lh-sm" />
      </button>
      <button
        v-if="!isBeingEdited(affect) && isModified"
        type="button"
        class="btn btn-sm"
        title="Discard changes (Revert)"
        tabindex="-1"
        @click.stop="revertChanges(affect)"
      >
        <i class="bi bi-backspace" />
      </button>
      <i class="row-right-indicator bi bi-caret-left-fill fs-4" />
    </td>
  </tr>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

tr {
  height: 39.2px;

  td {
    max-width: 24ch;
    transition:
      background-color 0.5s,
      color 0.5s,
      border-color 0.25s;
    padding-block: 0.2rem;
    border-block: 0.2ch solid #e0e0e0;
    background-color: #e0e0e0;

    .row-right-indicator {
      right: -42px;
    }

    .row-left-indicator {
      left: -42px;
    }

    .row-left-indicator,
    .row-right-indicator {
      position: absolute;
      opacity: 0;
      transition:
        opacity 0.5s,
        right 0.5s,
        left 0.5s;
      top: 0;
    }

    .btn {
      display: inline;
      margin-inline: 0.1rem;
      width: 28px;
      height: 25px;
      padding: 0 0.1rem;
      transition:
        background-color 0.5s,
        color 0.5s;
      border: none;
      background-color: #212529;
      color: white;

      .bi {
        line-height: 0;
        font-size: 0.938rem;
      }
    }

    &:nth-of-type(1) {
      padding-right: 0;
    }

    &:nth-of-type(2) {
      & > div {
        text-align: right;
      }
    }

    &:nth-of-type(7) {
      max-width: 24ch;
    }

    input,
    select {
      padding: 0.15rem 0.5rem;
    }

    .affect-tracker-cell {
      display: flex;

      .btn {
        width: 26px;
        height: 26px;

        .bi {
          font-size: 1.125rem;
        }
      }
    }
  }

  :not(.editing) td {
    user-select: none;
  }

  &:hover {
    filter: brightness(0.9);

    td {
      border-color: #707070bf;
    }
  }
}

tr.selected td {
  .row-left-indicator,
  .row-right-indicator {
    opacity: 100;
  }

  .row-right-indicator {
    right: -24px !important;
  }

  .row-left-indicator {
    left: -24px !important;
  }
}

tr.editing td {
  border-color: $light-yellow !important;
  background-color: $light-yellow;
  color: #73480b;

  .btn {
    background-color: #73480b;
  }
}

tr.modified td {
  border-color: $light-green !important;
  background-color: $light-green;
  color: #204d00;

  .btn {
    background-color: #204d00;
  }
}

tr.new td {
  border-color: #e0f0ff !important;
  background-color: #e0f0ff;
  color: #036;

  .btn {
    background-color: #036;
  }
}

tr.removed td {
  border-color: #ffe3d9 !important;
  background-color: #ffe3d9;
  color: #731f00;

  .btn {
    background-color: #731f00;
  }
}

tr.editing:hover td {
  border-color: #73470a80 !important;
}

tr.modified:hover td {
  border-color: #204d0080 !important;
}

tr.new:hover td {
  border-color: #00336680 !important;
}

tr.removed:hover td {
  border-color: #731f0080 !important;
}

td span.affect-field-error {
  white-space: normal;
}
</style>
