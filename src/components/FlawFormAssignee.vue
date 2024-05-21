<script setup lang="ts">
import EditableText from '@/components/widgets/EditableText.vue';
import { useUserStore } from '@/stores/UserStore';
import { nextTick, computed } from 'vue';
const owner = defineModel<string | null>({ default: null });
const userStore = useUserStore();

function selfAssign() {
  owner.value = userStore.userName;
}

function handleClick(fn: (arg?: any) => any){
  selfAssign();
  nextTick(fn);
}

const isAssignedToMe = computed(() => owner.value === userStore.userName);

</script>

<template>
  <label class="ps-3 mb-3 input-group osim-input">
    <div class="row">
      <span class="form-label col-3 pe-3 ">
        Assignee
      </span>
      <EditableText
        v-model="owner"
        label="Assignee"
        type="text"
      >
        <template v-if="!isAssignedToMe" #buttons-out-of-editing-mode="{ onBlur }">
          <button
            type="button"
            class="btn btn-primary osim-self-assign"
            @click.prevent.stop="handleClick(onBlur)"
          >Self Assign</button>
        </template>
        <template v-if="!isAssignedToMe" #buttons-in-editing-mode="{ onBlur }">
          <button
            type="button"
            class="btn btn-primary osim-self-assign"
            @click.prevent.stop="handleClick(onBlur)"
          >Self Assign</button>
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
