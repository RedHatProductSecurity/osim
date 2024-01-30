import { ref } from 'vue';

export function useModal() {
  const isModalOpen = ref(false);
  const openModal = () => (isModalOpen.value = true);
  const closeModal = () => (isModalOpen.value = false);

  return {
    isModalOpen,
    openModal,
    closeModal,
  };
}
