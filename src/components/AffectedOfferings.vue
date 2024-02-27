<script setup lang="ts">
import { computed, ref } from 'vue';
import { type ZodAffectType } from '@/types/zodFlaw';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';

const props = defineProps<{
  mode: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  remove: [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const theAffects = ref<ZodAffectType[]>(props.theAffects);

import { groupBy } from '@/utils/helpers';
import AffectedOfferingForm from './AffectedOfferingForm.vue';

const groupedAffects = computed(() =>
  groupBy(
    theAffects.value.filter(({ ps_module }) => ps_module),
    ({ ps_module }) => ps_module,
  ),
);

const ungroupedAffects = computed(() => theAffects.value.filter((affect) => !affect.ps_module));
</script>

<template>
  <div v-if="theAffects && mode === 'edit'" class="osim-affects mb-3">
    <hr />
    <h5 class="mb-4">Affected Offerings</h5>
    <div v-for="(streamAffects, streamName) in groupedAffects" :key="streamName">
      <LabelCollapsable :label="`${streamName} (${streamAffects.length} affected)`">
        <div
          v-for="(affects, componentName) in groupBy(
            streamAffects,
            ({ ps_component }) => ps_component,
          )"
          :key="componentName"
          class="container-fluid row affected-offering"
        >
          <LabelCollapsable :label="`${componentName} (${affects.length} affected)`">
            <div v-for="(affect, affectIndex) in affects" :key="affectIndex">
              <AffectedOfferingForm
                v-model="affects[affectIndex]"
                @remove="emit('remove', affect)"
                @file-tracker="emit('file-tracker', $event)"
              />
              <!-- @remove="removeAffect(theAffects.indexOf(affect))"
                @file-tracker="fileTracker($event as TrackersFilePost)"
                @add-blank-affect="addBlankAffect" -->
            </div>
          </LabelCollapsable>
        </div>
      </LabelCollapsable>
    </div>
    <h5 v-if="ungroupedAffects.length">Ungrouped Affected Offerings</h5>
    <div v-for="(affect, affectIndex) in ungroupedAffects" :key="affectIndex">
      <AffectedOfferingForm
        v-model="ungroupedAffects[affectIndex]"
        @remove="emit('remove', affect)"
      />
    </div>
    <button type="button" class="btn btn-secondary mt-3" @click.prevent="emit('add-blank-affect')">
      Add New Affect
    </button>
  </div>
</template>

<style scoped lang="scss">
.osim-affected-offerings {
  padding-left: 0.75rem;

  table.table-striped th {
    border-bottom: none;
  }
}
</style>
