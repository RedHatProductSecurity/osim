<script setup lang="ts">
import ObjectView from '../components/ObjectView.vue';
import DescriptionView from '../components/DescriptionView.vue';
import AffectsView from '../components/ObjectArray.vue';
import CommentsView from '../components/Comments.vue';
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    const affects = [
      {
        uuid: 'example-uuid-1',
        flaw: 'example-flaw-1',
        type: 'example-type-1',
        ps_module: 'example-module-1',
        ps_component: 'example-component-1',
        cvss3_score: '7.8',
        trackers: 'example-tracker-1'
      },
      {
        uuid: 'example-uuid-2',
        flaw: 'example-flaw-2',
        type: 'example-type-2',
        ps_module: 'example-module-2',
        ps_component: 'example-component-2',
        cvss3_score: '9.3',
        trackers: 'example-tracker-2'
      },
      {
        uuid: 'example-uuid-2',
        flaw: 'example-flaw-2',
        type: 'example-type-2',
        ps_module: 'example-module-2',
        ps_component: 'example-component-2',
        cvss3_score: '9.3',
        trackers: 'example-tracker-2'
      }
    ];

    const requestReview = false;
    const pushToMirte = false;
    const markPublic = false;

    function reject() {
      console.log('Reject clicked');
    }

    function submit() {
      console.log('Submit clicked');
    }

    return {
      affects,
      requestReview,
      pushToMirte,
      markPublic,
      reject,
      submit
    }
  }
});
</script>

<template>
    <main>
      <div class="align-items-center">
        <ObjectView />
        <DescriptionView />
        <AffectsView v-if="affects" :affects="affects" />
        <div class="card">
          <div class="card-body">
            <div class="d-flex justify-content-end align-items-center">
              <div class="form-check me-3">
                <input class="form-check-input" type="checkbox" id="request-review" v-model="requestReview">
                <label class="form-check-label" for="request-review">Request Review</label>
              </div>
              <div class="form-check me-3">
                <input class="form-check-input" type="checkbox" id="push-to-mirte" v-model="pushToMirte">
                <label class="form-check-label" for="push-to-mirte">Push to Mirte</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="mark-public" v-model="markPublic">
                <label class="form-check-label" for="mark-public">Mark Public</label>
              </div>
            </div>
            <div class="d-flex justify-content-end mt-3">
              <div class="me-3">
                <button type="button" class="btn btn-outline-secondary" @click="reject">Reject</button>
              </div>
              <div>
                <button type="button" class="btn btn-primary" @click="submit">Submit</button>
              </div>
            </div>
          </div>
        </div>
        <CommentsView/>
      </div>
    </main>
  </template>
  
  
  