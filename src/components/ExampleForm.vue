<script setup lang="ts">
import {reactive} from 'vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';

const fruits = ['apple', 'banana', 'orange'];
const sampleForm = reactive({
  salutation: '',
  fruitRecipient: '',
  chosenFruit: '',
  fruitNotes: '',
  fruitOrderDate: undefined,
  shipOvernight: false,
  bug: '',
});

function onSubmit() {
  console.log(arguments);
}
function onReset() {
  // do nothing
}

</script>

<template>
  <div class="osim-content container">
    <h2 class="mb-3">Example Form</h2>

    <form
        @submit.prevent="onSubmit"
    >
      <LabelEditable v-model="sampleForm.fruitOrderDate" label="Order Date" type="date"/>
      <LabelEditable v-model="sampleForm.salutation" label="Salutation" type="text" placeholder="Salutation"/>
<!--      <LabelEditable v-model="sampleForm.bug" label="Invalid" type="invalid"/>-->
      <LabelInput v-model="sampleForm.fruitRecipient" label="Recipient of the fruit"/>
      <LabelSelect :options="fruits" v-model="sampleForm.chosenFruit" label="Fruit"/>
      <LabelTextarea v-model="sampleForm.fruitNotes" label="Notes about the fruit" error="foobar"/>
      <LabelCheckbox v-model="sampleForm.shipOvernight" label="Ship Overnight"/>

<pre>
{{ JSON.stringify(sampleForm, null, 2) }}
</pre>

      <div class="osim-save-buttons text-end">
        <button type="button" class="btn btn-primary me-3" @click="onReset">Reset</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  </div>
</template>

<style scoped>

</style>
