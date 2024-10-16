<script setup lang="ts">
import { computed } from 'vue';

import CvssNISTForm from '@/components/CvssNISTForm.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';

import type { ZodFlawCVSSType } from '@/types/zodFlaw';

const props = defineProps<{
  allCvss: ZodFlawCVSSType[];
  bugzilla: string;
  cveid: null | string;
  cvss: string;
  highlightedNvdCvss3String: { char: null | string; isHighlighted: boolean }[][];
  nistcvss: string;
  shouldDisplayEmailNistForm: boolean;
  summary: string;
}>();

const otherScores = computed(() => props.allCvss.filter(cvssItem =>
  (!(cvssItem.cvss_version === 'V3' && (cvssItem.issuer === 'RH' || cvssItem.issuer === 'NIST')))));
</script>

<template>
  <div>
    <LabelDiv label="NVD CVSSv3">
      <div class="d-flex flex-row">
        <div class="form-control text-break h-auto" :class="{shouldDisplayEmailNistForm: 'rounded-0'}">
          <template v-if="cvss">
            <template v-for="(chars, index) in highlightedNvdCvss3String" :key="index">
              <span v-if="chars[0].isHighlighted" class="text-primary">
                {{ chars.map(c => c.char).join('') }}
              </span>
              <template v-else>{{ chars.map(c => c.char).join('') }}</template>
            </template>
          </template>
          <template v-else>
            <span>
              {{ nistcvss }}
            </span>
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
    <template v-for="cvssItem in otherScores" :key="cvssItem.uuid">
      <LabelDiv :label="cvssItem.issuer + ' CVSS' + cvssItem.cvss_version.toLocaleLowerCase()">
        <div class="d-flex flex-row">
          <div class="form-control text-break h-auto">
            <span>
              {{ cvssItem.score + ' CVSS:' + cvssItem.cvss_version.substring(1) + '/' + cvssItem.vector }}
            </span>
          </div>
        </div>
      </LabelDiv>
    </template>
  </div>
</template>
