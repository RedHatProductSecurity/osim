<script setup lang="ts">
import {ref} from 'vue';
import { DateTime } from 'luxon';

import Toast from '@/components/widgets/Toast.vue';
import Modal from '@/components/widgets/Modal.vue';
import ProgressRing from '@/components/widgets/ProgressRing.vue';
import {useToastStore} from '@/stores/ToastStore';
import ExampleValidatedForm from '@/components/ExampleValidatedForm.vue';

const {addToast} = useToastStore();

const modalComponentShown = ref(false);

const modalShown = ref(false);
function showModal() {
  console.log('show');
  modalShown.value = !modalShown.value;
}

const progress = ref(60);

</script>

<template>
  <main class="container mt-3">
    <input type="number" v-model.number="progress"/>
    <ProgressRing
        :progress="progress"
        :diameter="80"
        :stroke="10"
        direction="down"
        color="black"/>
    <ProgressRing
        class="d-inline-block"
        :progress="progress"
        :diameter="20"
        :stroke="5"
        :transition-duration-ms="1000"
        color="black"/>
    <ProgressRing
        class="d-inline-block"
        :progress="progress"
        :diameter="20"
        :stroke="10"
        :transition-duration-ms="200"
        direction="down"
        color="black"/>
    <Modal :show="modalComponentShown" @close="modalComponentShown = false">
      <template #body>
        <p>foobar settings</p>
      </template>
    </Modal>
    <div></div>
    <button
        type="button"
        class="btn btn-primary m-1"
        @click="modalComponentShown = true">
      Launch Demo Component Modal
    </button>
    <button
        type="button"
        class="btn btn-primary m-1"
        @click="addToast({title: 'title', body: 'expiring body' + Date.now(), timeoutMs: 5000})"
    >
      Open expiring toast
    </button>
    <button
        type="button"
        class="btn btn-primary m-1"
        @click="addToast({title: 'footitle', body: 'foobody' + Date.now()})"
    >
      Open toast
    </button>

    <Toast body="mybody" :timestamp="DateTime.now()" title="mytitle" css="dark"></Toast>

    <!--<ExampleForm/>-->
    <ExampleValidatedForm/>


  </main>
</template>
