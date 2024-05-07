<script setup lang="ts">
import { computed, ref } from 'vue';
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import { 
  calculatorButtons,
  getFactors,
  formatFactor,
  calculateScore,
  // getFactorColor,
  formatFactors,
  factorSeverities,
  validateCvssVector,
  weights,
} from '@/composables/useCvssCalculator';

const cvssVector = defineModel<string | undefined | null>('cvssVector');
const cvssScore = defineModel<number | null>('cvssScore');

const error = computed(() => validateCvssVector(cvssVector.value));

const cvssFactors = ref<Record<string, string>>({});
const isFocused = ref(false);
const highlightedFactor = ref<string | null>(null);

const cvssDiv = ref();
const cvssVectorInput = ref();

function updateFactors(newCvssVector: string | undefined | null) {
  if(cvssVector.value !== newCvssVector) {
    cvssVector.value = newCvssVector;
  }
  cvssFactors.value = getFactors(newCvssVector ?? '');
}

updateFactors(cvssVector.value);

function factorButton(id: string, key: string) {
  if(!cvssFactors.value['CVSS']) {
    cvssFactors.value = getFactors('CVSS:3.1');
  }
  cvssFactors.value[id] = cvssFactors.value[id] === key ? '' : key;
  updateFactors(formatFactors(cvssFactors.value));
  cvssScore.value = calculateScore(cvssFactors.value);
}

function onInputFocus(event: FocusEvent) {
  isFocused.value = true;
  if (event.target !== cvssVectorInput.value) {
    cvssVectorInput.value.focus();
  }
}

function onInputBlur(event: FocusEvent) {
  if(event.relatedTarget !== cvssDiv.value) {
    isFocused.value=false;
  }
}

function reset() {
  cvssScore.value = null;
  cvssVector.value = null;
  cvssFactors.value = {};
}

const getFactorColor = computed(() => (weight: number, isHovered: boolean = false) => {
  const hue = isHovered ? 200 : (1 - weight) * 80; // red being 0, 80 being green
  const alpha = highlightedFactor.value === null 
    ? 1 
    : isHovered
      ? 1 
      : 0.75;
  console.log(hue, alpha);
  const hslForText = `hsla(${hue}, 100%, 35%, ${alpha})`;
  const hslForBackground = `hsla(${hue}, 100%, 95%, ${alpha})`;
  return {
    'color': hslForText,
    'background-color': hslForBackground,
  };
});

function highlightFactor(factor: string | null) {
  highlightedFactor.value = factor;
}

function handlePaste(e: ClipboardEvent) {
  let maybeCvss = e.clipboardData?.getData('text');
  if (!maybeCvss) {
    return; 
  }

  updateFactors(maybeCvss);
  if (!getFactors(maybeCvss)['CVSS']) {
    cvssFactors.value['CVSS'] = '3.1';
  }

  updateFactors(formatFactors(cvssFactors.value));
  cvssScore.value = calculateScore(cvssFactors.value);
}


</script>

<template>
  <div
    ref="cvssDiv"
    tabindex="0"
    @focus="onInputFocus"
    @paste="handlePaste"
  >
    <div class="osim-input vector-row">
      <label class="label-group row">
        <span class="form-label col-2">
          CVSSv3
        </span>
        <div class="input-wrapper col">
          <div
            ref="cvssVectorInput"
            tabindex="0"
            class="vector-input form-control"
            :class="{ 
              'is-invalid': error != null, 
              'dark-background': isFocused,
              'text-cursor': isFocused,
              'alert alert-warning': !cvssVector
            }"
            v-bind="$attrs"
            focused
            @focus="onInputFocus"
            @blur="onInputBlur"
            @change="updateFactors(cvssVector)"
          >
            <template v-for="(value, key) in cvssFactors" :key="key">
              <span
                v-if="value"
                :style="isFocused && key.toString() !== 'CVSS'
                  ? getFactorColor(weights[key][value], key === highlightedFactor)
                  : (isFocused ? {color: 'white'} : {color: 'black'})"
                @mouseover="highlightFactor(key)"
                @mouseleave="highlightFactor(null)"
              >
                {{ formatFactor(key.toString(), value) }}
              </span>
            </template>
          </div>
        </div>
        <div
          v-if="error"
          class="invalid-tooltip"
        >
          {{ error }}
        </div>
      </label>
      <button
        type="button"
        :disabled="!cvssVector"
        class="erase-button input-group-text"
        @click="reset()"
        @mousedown="event => event.preventDefault()"
      >
        <i class="bi bi-eraser"></i>
      </button>
    </div>
    <div
      class="cvss-calculator row"
      :class="{ 'visually-hidden': !isFocused }"
    >
      <div
        class="osim-input"
        mx-0nd="$attrs"
      >
        <div class="px-3 py-2">
          <div 
            v-for="(row, rowIndex) in calculatorButtons.rows" 
            :key="rowIndex" 
            class="row-group"
          >
            <div
              v-for="(col, colIndex) in row.cols"
              :key="colIndex" 
              class="col-group"
            >
              <div
                class="btn-group-vertical btn-group-sm osim-factor-severity-select"
                @mouseover="highlightFactor(col.id)"
                @mouseleave="highlightFactor(null)"
              >
                <button
                  class="btn-group-header btn lh-sm" 
                  :class="{ 'osim-factor-highlight': col.id === highlightedFactor}"
                  disabled
                >{{ col.label }}</button>
                <template v-for="(button, btnIndex) in col.buttons" :key="btnIndex">
                  <button
                    type="button"
                    class="btn lh-sm"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    :title="`${factorSeverities[col.id][button.key]}: ${button.info}`"

                    :style="
                      cvssFactors[col.id] === button.key ?
                        getFactorColor(weights[col.id][button.key]) : {
                          backgroundColor:'#E0E0E0',
                          color: (cvssFactors[col.id] === button.key
                            && factorSeverities[col.id][button.key] !== 'Bad')
                            ? 'white'
                            : 'inherit'
                        }"
                    @click="factorButton(col.id, button.key)"
                    @mousedown="event => event.preventDefault()"
                  >
                    {{ button.name }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <LabelStatic
      v-model="cvssScore"
      label="CVSSv3 Score"
      type="text"
      class="score-input"
      :hasTopLabelStyle="false"
    />
  </div>
</template>

<style scoped lang="scss">
.osim-input {
  display: inline-flex;
  width: 100%;
  margin-bottom: 15px;

  .label-group {
    width: 100%;
    position: relative;
    min-height: 38px;
    margin-inline: 0;
    padding-left: 0.25rem;
    height: 100%;
  
    .input-wrapper {
      z-index: 1;
      padding-inline: 0;
      margin-inline: 0;
    }

    .vector-input {
      height: 100%;
      border-radius: 0;
      padding-left: 30px;
    }

    .vector-input.alert {
      padding-block: 10px;
    }
    
  }

  .erase-button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: 0;
  }

  .invalid-tooltip {
    display: none;
  }

  &:hover .invalid-tooltip {
    display: block;
    width: 75%;
    right: 5%;
  }

  .row-group {
    display: flex;
    flex-direction: row;
    margin-block: 10px;

    .col-group {
      display: flex;
      flex-direction: column;
      margin-inline: 5px;
      width: 100%;
      
      .btn-group-header {
        background-color: #1F1F1F !important;
        color: white;
        border: 0;
        padding-block: 7.5px;
        font-weight: 600;

        &.osim-factor-highlight {
          background-color: hsl(200deg 100% 95%) !important;
          color: hsl(200deg 100% 35%) !important;
        }
      }

      .btn, .btn:hover {
        border: 1px;
        margin: auto;
      }
    }
  }
}

.score-input {
  display: block;
}

.text-cursor {
  cursor: text !important;
}

.dark-background {
  background-color: #525252 !important;
}
</style>
