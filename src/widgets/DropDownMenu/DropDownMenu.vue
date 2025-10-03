<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

interface Props {
  offset?: number;
  placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-start',
  offset: 8,
});

const emit = defineEmits<{
  close: [];
  open: [];
}>();

const isOpen = ref(false);
const triggerRef = ref<HTMLElement>();
const dropdownRef = ref<HTMLElement>();
const dropdownPosition = ref({ top: 0, left: 0 });

const calculatePosition = async () => {
  if (!triggerRef.value) return;

  await nextTick();

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const dropdownEl = dropdownRef.value;

  if (!dropdownEl) return;

  const dropdownRect = dropdownEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (props.placement) {
    case 'bottom-start':
      top = triggerRect.bottom + props.offset;
      left = triggerRect.left;
      break;
    case 'bottom-end':
      top = triggerRect.bottom + props.offset;
      left = triggerRect.right - dropdownRect.width;
      break;
    case 'top-start':
      top = triggerRect.top - dropdownRect.height - props.offset;
      left = triggerRect.left;
      break;
    case 'top-end':
      top = triggerRect.top - dropdownRect.height - props.offset;
      left = triggerRect.right - dropdownRect.width;
      break;
  }

  // Adjust if dropdown would go outside viewport
  if (left + dropdownRect.width > viewportWidth) {
    left = viewportWidth - dropdownRect.width - 8;
  }
  if (left < 8) {
    left = 8;
  }
  if (top + dropdownRect.height > viewportHeight) {
    top = triggerRect.top - dropdownRect.height - props.offset;
  }
  if (top < 8) {
    top = triggerRect.bottom + props.offset;
  }

  dropdownPosition.value = { top, left };
};

const toggleDropdown = async () => {
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
  }
};

const openDropdown = async () => {
  isOpen.value = true;
  emit('open');
  await nextTick();
  calculatePosition();
};

const closeDropdown = () => {
  isOpen.value = false;
  emit('close');
};

const handleResize = () => {
  if (isOpen.value) {
    calculatePosition();
  }
};

const handleScroll = () => {
  if (isOpen.value) {
    calculatePosition();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleScroll, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleScroll, true);
});

defineExpose({
  isOpen,
  open: openDropdown,
  close: closeDropdown,
  toggle: toggleDropdown,
});
</script>

<template>
  <div ref="triggerRef" class="dropdown-container">
    <div class="dropdown-trigger px-1" @click="toggleDropdown">
      <slot name="trigger" :isOpen="isOpen" />
    </div>

    <Teleport to="#app">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="dropdown-menu"
        @click.stop
      >
        <slot name="content" :close="closeDropdown" />
      </div>
    </Teleport>

    <div
      v-if="isOpen"
      class="dropdown-backdrop"
      @click="closeDropdown"
    ></div>
  </div>
</template>

<style scoped>
.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  cursor: pointer;
}

.dropdown-menu {
  top: calc(v-bind('dropdownPosition.top') * 1px);
  position: fixed;
  left: calc(v-bind('dropdownPosition.left') * 1px);
  z-index: 9999;
  display: flex;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 10%),
    0 4px 6px -2px rgb(0 0 0 / 5%);
  max-width: 420px;
  animation: fade-in 0.15s ease-out;
  padding: var(--bs-dropdown-padding-y) var(--bs-dropdown-padding-x);
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  cursor: default;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
