<script setup lang="ts">

</script>

<template>
  <form class="container">
    <div class="row mb-3 text-center">
      <span class="col">Login</span>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="username" class="visually-hidden">Username</label>
        <div class="input-group">
          <input type="text" class="form-control" placeholder="username" id="username">
          <div class="input-group-text">@redhat.com</div>
        </div>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
        <button class="btn btn-primary align-self-end" type="button">Login</button>
      </div>
    </div>
  </form>
</template>

<style scoped>
form {
  border: 1px solid black;
  border-radius: var(--bs-border-radius);
  max-width: 500px;
  min-height: min(100vh - 2px, 300px);
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
