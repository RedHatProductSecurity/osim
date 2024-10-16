<script setup lang="ts">
import { computed } from 'vue';

import CvssNISTForm from '@/components/CvssNISTForm.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';

import type { ZodFlawCVSSType } from '@/types/zodFlaw';

const props = defineProps<{
  allScores: ZodFlawCVSSType[];
  bugzilla: string;
  cveid: null | string;
  cvss: string;
  highlightedNvdCvss3String: { char: null | string; isHighlighted: boolean }[][];
  nistcvss: string;
  shouldDisplayEmailNistForm: boolean;
  summary: string;
}>();

const otherScores = computed(() => props.allScores.filter(score =>
  (!(score.cvss_version === 'V3' && (score.issuer === 'RH' || score.issuer === 'NIST')))));
</script>

<template>
  <div>
    <LabelDiv label="NVD CVSSv3">
      <div class="d-flex flex-row">
        <div class="form-control text-break h-auto" :class="{shouldDisplayEmailNistForm: 'rounded-0'}">
          <template v-for="(chars, index) in highlightedNvdCvss3String" :key="index">
            <span v-if="chars[0].isHighlighted" class="text-primary">
              {{ chars.map(c => c.char).join('') }}
            </span>
            <template v-else>{{ chars.map(c => c.char).join('') }}</template>
          </template>
        </div>
        <div v-if="shouldDisplayEmailNistForm" class="col-auto align-self-center">
          <CvssNISTForm
            :cveid
            :summary
            :bugzilla
            :cvss
            :nistcvss
          />
        </div>
      </div>
    </LabelDiv>
    <template v-for="score in otherScores" :key="score.uuid">
      <LabelDiv :label="score.issuer + ' CVSS' + score.cvss_version.toLocaleLowerCase()">
        <div class="d-flex flex-row">
          <div class="form-control text-break h-auto">
            <span>
              {{ score.score + ' CVSS:' + score.cvss_version.substring(1) + '/' + score.vector }}
            </span>
          </div>
        </div>
      </LabelDiv>
    </template>
  </div>
</template>
