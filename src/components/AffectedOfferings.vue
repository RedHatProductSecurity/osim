<script setup lang="ts">
import { computed, toRefs, watch } from 'vue';

import { groupBy } from '@/utils/helpers';
import { type ZodAffectType } from '@/types/zodFlaw';

import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';

const props = defineProps<{
  mode: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  remove: [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();
const { theAffects, affectsToDelete } = toRefs(props);
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
    <div v-if="affectsToDelete.length" class="mt-3 row">
      <div class="col-auto bg-warning rounded-3 p-3">
        <h5>Affected Offerings To Be Deleted</h5>
        <div v-for="(affect, affectIndex) in affectsToDelete" :key="affectIndex">
          <ul>
            <li>
              {{ affect.ps_module || '<module not set>' }}::{{ affect.ps_component || '<component not set>' }}
                {{ !affect.uuid ? '(doesn\'t exist yet in OSIDB)' : '' }}
              <button
                type="button"
                class="btn btn-secondary"
                @click.prevent="emit('recover', affect)"
              >
                Recover
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
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
