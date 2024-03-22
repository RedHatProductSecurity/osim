import { ref } from 'vue';
// // Should this be global?
// const isModalOpen = ref(false);
// const openModal = () => (isModalOpen.value = true);
// const closeModal = () => (isModalOpen.value = false);

export function useModal() {
  // Should this be local? (each time useModal is called, there is local state)
  const isModalOpen = ref(false);
  const openModal = () => (isModalOpen.value = true);
  const closeModal = () => (isModalOpen.value = false);

  return {
    isModalOpen,
    openModal,
    closeModal,
  };
}
