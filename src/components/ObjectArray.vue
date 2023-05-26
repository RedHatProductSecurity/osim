<script setup lang="ts">

defineProps<{
  // flaw: Flaw
  affects: any[]
}>();
</script>

<template>
    <div>
      <h5>Affects</h5>
      <div class="accordion" id="affectsAccordion">
        <!-- Iterate over each affect item -->
        <div v-for="(affect, index) in affects" :key="index" class="accordion-item">
          <h2 class="accordion-header" :id="'affect' + index">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse' + index" aria-expanded="false" :aria-controls="'collapse' + index">
              {{affect.ps_module}}
            </button>
          </h2>
          <div :id="'collapse' + index" class="accordion-collapse collapse" :aria-labelledby="'affect' + index" data-bs-parent="#affectsAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table">
                  <tbody>
                    <tr>
                      <td>UUID: {{affect.uuid}}</td>
                      <td>Flaw: {{affect.flaw}}</td>
                      <td>Type: {{affect.type}}</td>
                      <td>PS Module: {{affect.ps_module}}</td>
                    </tr>
                    <tr>
                      <td>PS Component: {{affect.ps_component}}</td>
                      <td>CVSS Score: {{affect.cvss3_score}}</td>
                      <td colspan="2">Trackers: {{affect.trackers}}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  