<script setup lang="ts">
import { computed, ref } from 'vue';

import CvssNISTForm from '@/components/CvssNISTForm/CvssNISTForm.vue';

import { issuerLabels } from '@/composables/useFlawCvssScores';

import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import type { ZodFlawCVSSType } from '@/types';

const props = defineProps<{
  allCvss: ZodFlawCVSSType[];
  bugzilla: string;
  cveId: null | string;
  cvss: string;
  cvssVersion: string;
  highlightedNvdCvssString: { char: null | string; isHighlighted: boolean }[][];
  nistCvss: string;
  shouldDisplayEmailNistForm: boolean;
  summary: string;
}>();

const showAllCvss = ref(false);

const otherCvss = computed(() => props.allCvss.filter(cvssItem =>
  (
    !(cvssItem.cvss_version === CVSS_V3 && (cvssItem.issuer === IssuerEnum.Rh || cvssItem.issuer === IssuerEnum.Nist))
  )));

function cvssDisplay(score: string, vector: string, version: string) {
  return vector.includes('CVSS')
    ? score + ' ' + vector
    : score + ' CVSS:' + version + '/' + vector;
}
</script>

<template>
  <div>
    <LabelDiv :label="'NVD CVSS ' + cvssVersion" class="mb-2">
      <template v-if="otherCvss && otherCvss.length > 0" #labelSlot>
        <button
          class="btn btn-sm me-auto border-0"
          type="button"
          :title="(showAllCvss ? 'Hide' : 'Show') + ' all available CVSS versions and issuers'"
          @click="() => showAllCvss = !showAllCvss"
        >
          <i :class="showAllCvss ? 'bi bi-caret-down' : 'bi bi-caret-right'" style="font-size: 2.25ch;" />
        </button>
      </template>
      <div class="d-flex flex-row">
        <div class="form-control text-break h-auto" :class="shouldDisplayEmailNistForm ? 'rounded-0' : ''">
          <template v-if="cvss">
            <template v-for="(chars, index) in highlightedNvdCvssString" :key="index">
              <span v-if="chars[0].isHighlighted" class="text-primary">
                {{ chars.map(c => c.char).join('') }}
              </span>
              <template v-else>{{ chars.map(c => c.char).join('') }}</template>
            </template>
          </template>
          <template v-else>
            <span>
              {{ nistCvss }}
            </span>
          </template>
        </div>
        <div v-if="shouldDisplayEmailNistForm" class="col-auto align-self-center">
          <CvssNISTForm
            :cveId
            :summary
            :bugzilla
            :cvss
            :nistCvss
          />
        </div>
      </div>
    </LabelDiv>
    <div v-if="showAllCvss" class="bg-secondary p-2 ps-1 ms-1 mb-2 rounded">
      <template
        v-for="(cvssItem, cvssItemIndex) in otherCvss"
        :key="cvssItemIndex.uuid"
      >
        <LabelDiv
          :label="issuerLabels[cvssItem.issuer] + ' CVSS' + cvssItem.cvss_version.toLocaleLowerCase()"
          :class="cvssItemIndex < otherCvss.length -1 ? 'mb-2' : ''"
        >
          <div class="d-flex flex-row">
            <div class="form-control text-break h-auto">
              <span>
                {{
                  cvssDisplay(
                    cvssItem.score?.toString() || '',
                    cvssItem.vector || '',
                    cvssItem.cvss_version.substring(1)
                  )
                }}
              </span>
            </div>
          </div>
        </LabelDiv>
      </template>
    </div>
  </div>
</template>
