<script setup lang="ts">
import {onMounted, ref, watch, watchEffect} from 'vue';
import IssueEdit from '../components/IssueEdit.vue';
import {getFlaw, putFlaw} from '../services/FlawService';
import {useToastStore} from '@/stores/ToastStore';
import {getDisplayedOsidbError} from '@/services/OsidbAuthService';
import {postAffect, putAffect} from '@/services/AffectService';
import {type Flaw, FlawType} from '@/generated-client';
import {ZodFlawSchema} from '@/types/zodFlaw';


const flaw = ref<Flaw | null>(null);
const committedFlaw = ref<Flaw | null>(null);
const errorLoadingFlaw = ref(false);
const props = defineProps<{
  id: string,
}>();

const {addToast} = useToastStore();

refreshFlaw();

watch(() => props.id, () => {
  refreshFlaw();
});

function refreshFlaw() {
  errorLoadingFlaw.value = false;
  getFlaw(props.id)
      .then(theFlaw => {
        flaw.value = Object.assign({}, theFlaw);
        committedFlaw.value = Object.assign({}, theFlaw);
      })
      .catch(err => {
        errorLoadingFlaw.value = true;
        flaw.value = null;
        addToast({
          title: 'Error loading Flaw',
          body: getDisplayedOsidbError(err),
        });
        console.error(err);
      });
}

const onSubmitAffect = async () => {
  if (!flaw.value?.affects?.length) {
    return; // TODO
  }
  for (let affect of flaw.value?.affects) {
    let go = true;
    console.log('saving the affect', affect);
    console.log(affect.uuid);
    const newAffect = {
      flaw: flaw.value?.uuid,
      type: affect.type,
      affectedness: affect.affectedness,
      resolution: affect.resolution,
      ps_module: affect.ps_module,
      ps_component: affect.ps_component,
      impact: affect.impact,
      embargoed: affect.embargoed || false,
      updated_dt: affect.updated_dt,
    }
    if (!go) {
      continue;
    }
    if (affect.uuid != null) {
      await putAffect(affect.uuid, newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch(error => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          })
    } else {
      await postAffect(newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch(error => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          })
    }
  }
  refreshFlaw();
}

const onSubmit = () => {
  if (!flaw.value) {
    return; // TODO
  }
  const newFlaw = ZodFlawSchema.safeParse(flaw.value);
  if (!newFlaw.success) {
    addToast({
      title: 'Error saving Flaw',
      body: newFlaw.error.toString(),
    });
    return; // TODO
  }
  let flawSaved = false;
  console.log(newFlaw.data);
  // Save Flaw, then safe Affects, then refresh
  putFlaw(flaw.value.uuid, newFlaw.data)
      .then(() => {
        flawSaved = true;
        console.log('saved flaw', flaw);
      })
      .then(() => {
        if (flawSaved) {
          addToast({
            title: 'Info',
            body: 'Flaw Saved',
          });
          refreshFlaw();
        }
      })
      .catch(error => {
        const displayedError = getDisplayedOsidbError(error);
        addToast({
          title: 'Error saving Flaw',
          body: displayedError,
        });
        console.log(error);
      })
  for (let affect of newFlaw.data.affects) {
    console.log('saving the affect', affect); // TODO
  }
};

const onReset = (payload: MouseEvent) => {
  console.log('onReset');
  flaw.value = Object.assign({}, committedFlaw.value);
  // FIXME XXX TODO
}


</script>

<template>
  <main>
    <form @submit.prevent="onSubmit">

      <IssueEdit v-if="flaw" @refresh:flaw="refreshFlaw" v-model:flaw="flaw" mode="edit"/>
      <div v-if="flaw" class="osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end">
        <!--        <button type="button" class="btn btn-primary col">Customer Pending</button>-->
        <!--        <button type="button" class="btn btn-primary col">Close this issue without actions</button>-->
        <!--        <button type="button" class="btn btn-primary col">Move this issue to another source queue</button>-->
        <!--        <button type="button" class="btn btn-primary col">Create a flaw</button>-->
        <!--        <button type="button" class="btn btn-primary col">Create hardening bug/weakness</button>-->
        <button
            type="button"
            class="btn btn-secondary"
            @click="onReset"
        >
          Reset Changes
        </button>
        <button
            type="submit"
            class="btn btn-primary"
        >
          Save Changes
        </button>
      </div>
    </form>

    <!--    <FlawEditForm v-if="flaw" :modelValue="flaw"/>-->
    <div v-if="errorLoadingFlaw">
      <div class="row justify-content-around">
        <div class="m-5  col-lg-6 col-md-8 col-sm-12">
          <div class="alert alert-warning" role="alert">
            Flaw {{ `${props.id}` }} not found.
            <div class="mt-4">
              <RouterLink class="btn btn-primary me-3" to="/flaws/new">Create New Flaw</RouterLink>
              <RouterLink class="btn btn-primary" to="/flaws">See All Flaws</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!flaw && !errorLoadingFlaw" class="d-flex justify-content-center m-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.osim-action-buttons {
  background: white;
  border-top: 1px solid #ddd;
  margin-left: 20px;
  margin-right: 20px;
  padding-right: 20px;
  padding-bottom: 2rem;
  padding-top: 0.5rem;
}
</style>
<!--

Workflow:
1: Load flaw
2: Flaw -> component
3: Component
    edit
    save
4: component -> view
5: view submits

-->
