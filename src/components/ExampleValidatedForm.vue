<script setup lang="ts">
import { reactive, ref } from 'vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';
import LabelInputCollapsable from '@/components/widgets/LabelInputCollapsable.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import { toTypedSchema } from '@vee-validate/zod';
import { useField, useForm } from 'vee-validate';
import { z } from 'zod';

type ExampleFormType = z.infer<typeof ExampleFormSchema>;
const ExampleFormSchema = z.object({
  salutation: z.string(),
  fruitRecipient: z.string().min(2),
  chosenFruit: z.enum(['apple', 'banana', 'orange']),
  fruitColor: z.enum(['Red', 'Green', 'Yellow', 'Blue']),
  fruitNotes: z.string(),
  // fruitOrderDate: z.string().datetime(), // ISO date string
  fruitOrderDate: z.date().optional(), // ISO date string
  shipOvernight: z.boolean().optional(),
  bug: z.string().optional(),
});
const availableFruits = Object.keys(ExampleFormSchema.shape.chosenFruit.Values);

let committedForm: ExampleFormType = reactive({ // form from server
  salutation: 'Dr.',
  fruitRecipient: 'John',
  chosenFruit: 'orange',
  fruitColor: 'Red',
  fruitNotes: 'box of ripe oranges',
  fruitOrderDate: undefined,
  shipOvernight: true,
  bug: undefined,
});
// let stagedForm: ExampleFormType = committedForm;

const validationSchema = toTypedSchema(ExampleFormSchema);
const initialValues = ref<ExampleFormType>({ ...committedForm });
const { handleSubmit, errors, setValues, values, meta } = useForm({
  validationSchema,
  initialValues: initialValues.value,
});

// const fruitNotesExample = ref('');

const { value: salutation } = useField<string>('salutation');
const { value: fruitRecipient } = useField<string>('fruitRecipient');
const { value: chosenFruit } = useField<string>('chosenFruit');
const { value: fruitNotes } = useField<string>('fruitNotes');
const { value: fruitOrderDate } = useField<Date>('fruitOrderDate');
const { value: fruitColor } = useField<string>('fruitColor');
const { value: shipOvernight } = useField<boolean>('shipOvernight');
// const {value: bug} = useField<string>('bug');


const onSubmit = handleSubmit((values: ExampleFormType) => {
  console.log('onSubmit');
  console.log('saving values', values);
  committedForm = values;
  Promise.resolve('success')
    .then(() => {
      initialValues.value = committedForm;
      console.log('saved values', values);
      // committedForm = values;
    });
});
const onReset = () => {
  console.log('onReset');
  setValues(committedForm);
  // initialValues.value = committedForm;
  // resetForm();
};
</script>

<!-- eslint-disable -->
<template>
  <div class="osim-content container d-block">
    <hr/>
    <h2>Example Validated Form</h2>

    <form
        @submit.prevent="onSubmit"
    >
      <LabelEditable v-model="fruitOrderDate" label="Order Date" type="date" :error="errors.fruitOrderDate"/>
      <LabelEditable v-model="salutation" label="Salutation" type="text" placeholder="Salutation" :error="errors.salutation"/>
      <!--<LabelEditable v-model="bug" label="Invalid" type="invalid" :error="errors.bug"/>-->
      <LabelInput v-model="fruitRecipient" label="Recipient of the fruit" :error="errors.fruitRecipient"/>
      <LabelSelect :options="availableFruits" v-model="chosenFruit" label="Fruit" :error="errors.chosenFruit"/>
      <LabelInputCollapsable v-model="fruitColor" label="Fruit color" :error="errors.fruitColor" >
        <div class="m-auto btn-group w-25">
          <button class="btn btn-primary border-0" :disabled="fruitColor === 'Red'" @click.prevent="fruitColor = 'Red'" @mousedown="event => event.preventDefault()">Red</button>
          <button class="btn bg-success border-0" :disabled="fruitColor === 'Green'" @click.prevent="fruitColor = 'Green'" @mousedown="event => event.preventDefault()">Green</button>
          <button class="btn btn-warning border-0" :disabled="fruitColor === 'Yellow'" @click.prevent="fruitColor = 'Yellow'" @mousedown="event => event.preventDefault()">Yellow</button>
          <button class="btn btn-info border-0" :disabled="fruitColor === 'Blue'" @click.prevent="fruitColor = 'Blue'" @mousedown="event => event.preventDefault()">Blue</button>
        </div>
      </LabelInputCollapsable>
      <!--<LabelTextarea v-model="fruitNotesExample" label="Example invalid field" error="example error"/>-->
      <LabelTextarea v-model="fruitNotes" label="Notes about the fruit" :error="errors.fruitNotes"/>
      <LabelCheckbox v-model="shipOvernight" label="Ship Overnight" :error="errors.shipOvernight"/>

      <div class="row">
        <div class="col">
<pre>
Staged local values:
{{ JSON.stringify(values, null, 2) }}
</pre>
        </div>
        <div class="col">
<pre>
Committed values on server:
{{ JSON.stringify(committedForm, null, 2) }}
</pre>
        </div>
      </div>

      <div
          v-if="meta.dirty"
          class="alert alert-warning"
          role="alert"
      >Remember to save your changes</div>


      <div class="osim-save-buttons text-end">
        <button type="button" class="btn btn-primary me-3" @click="onReset">Reset</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  </div>
</template>
