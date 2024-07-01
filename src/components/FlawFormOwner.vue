<script setup lang="ts">
import EditableText from '@/components/widgets/EditableText.vue';
import { useUserStore } from '@/stores/UserStore';
import { nextTick, computed, ref } from 'vue';

const owner = defineModel<string | null>({ default: null });
const userStore = useUserStore();

async function selfAssign() {
  isLoading.value = true;
  return userStore.updateJiraUsername().then(() => {
    if (userStore.jiraUsername !== '') {
      owner.value = userStore.jiraUsername;
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

async function handleClick(fn: (arg?: any) => any){
  await selfAssign();
  nextTick(fn);
}

const isAssignedToMe = computed(() =>
  owner.value === userStore.jiraUsername && userStore.jiraUsername !== ''
);

const isLoading = ref(false);

</script>

<template>
  <label class="ps-3 mb-3 input-group osim-input">
    <div class="row">
      <span class="form-label col-3 pe-3 ">
        Owner
      </span>
      <EditableText v-model="owner">
        <template v-if="!isAssignedToMe" #buttons-out-of-editing-mode="{ onBlur }">
          <button
            type="button"
            class="btn btn-primary osim-self-assign"
            :disabled="isLoading"
            @click.prevent.stop="handleClick(onBlur)"
          >
            Self Assign
          </button>
        </template>
        <template v-if="!isAssignedToMe" #buttons-in-editing-mode="{ onBlur }">
          <button
            type="button"
            class="btn btn-primary osim-self-assign"
            :disabled="isLoading"
            @click.prevent.stop="handleClick(onBlur)"
          >
            Self Assign
          </button>
        </template>
      </EditableText>
    </div>
  </label>
</template>


<style lang="scss" scoped>
label.osim-input {
  display: block;
}
</style>
