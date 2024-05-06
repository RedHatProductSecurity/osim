import { ref } from 'vue';
import { getJiraComments, postJiraComment } from '@/services/JiraService';
import { useToastStore } from '@/stores/ToastStore';

interface Comment {
  author: string;
  timestamp: string;
  body: string;
}

export function useInternalComments(taskKey: string) {
  const { addToast } = useToastStore();
  const available = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const internalComments = ref<Comment[]>([]);

  function loadInternalComments() {
    isLoading.value = true;
    internalComments.value = [];

    getJiraComments(taskKey)
      .then((res) => {
        if(res.response.ok) {
          available.value = true;
        }
        if(res.data.comments.length >= 0) {
          internalComments.value = parseJiraComments(res.data.comments);
        }
      })
      .catch((res) => { 
        if(res?.response?.status === 404) {
          console.error('Internal Comments Error: Task not found.', res?.response);
        } else {
          console.error('Internal Comments Error: getJiraComments error: ', res?.response);
        }
        available.value = false;
      })
      .finally(() => {
        isLoading.value = false;
      });
  }

  async function addInternalComment(comment: string) {
    isSaving.value = true;
    
    postJiraComment(taskKey, comment)
      .then(() => {
        addToast({
          title: 'Operation Successful',
          body: 'Internal comment saved.',
          css: 'success',
        });
        loadInternalComments();
      })
      .catch((err) => {
        addToast({
          title: 'Error',
          body: `Error saving internal Jira comment. ${err}`,
          css: 'warning',
        });
      })
      .finally(() => isSaving.value = false);
  }

  function isAvailable() {
    return available.value && taskKey;
  }

  function parseJiraComments(comments: any) {
    return comments.map((comment: any) => {
      return {
        author: comment.author.name,
        timestamp: comment.created,
        body: comment.body,
      };
    });
  }

  return {
    isLoading,
    isAvailable,
    internalComments,
    addInternalComment,
    loadInternalComments
  };
}

