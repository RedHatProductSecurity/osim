import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useScreenSizeWatcher() {
  const screenWidth = ref(window.innerWidth);
  const screenHeight = ref(window.innerHeight);

  onMounted(() => {
    window.addEventListener('resize', handleResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  return { screenWidth, screenHeight };

  function handleResize() {
    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;
  }
}