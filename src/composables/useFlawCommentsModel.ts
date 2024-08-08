import { computed, ref, type Ref } from 'vue';
import { getJiraComments, postJiraComment } from '@/services/JiraService';
import type { ZodFlawCommentType, ZodFlawType } from '@/types/zodFlaw';
import { postFlawComment } from '@/services/FlawService';
import { CommentType, SYSTEM_EMAIL } from '@/constants';


type OsidbCommentFilter = Exclude<keyof typeof CommentType, 'Internal'>
type OsidbCommentFilterFunctions = Record<OsidbCommentFilter, (comment: ZodFlawCommentType) => boolean>;

const filterFunctions: OsidbCommentFilterFunctions = {
  Public: (comment: any) => !comment.is_private,
  Private: (comment: any) => comment.is_private && comment.creator !== SYSTEM_EMAIL,
  System: (comment: any) => comment.creator === SYSTEM_EMAIL,
};

export function useFlawCommentsModel(flaw: Ref<ZodFlawType>, isSaving: Ref<boolean>, afterSaveSuccess: () => void) {
  const internalCommentsAvailable = ref(false);
  const isLoadingInternalComments = ref(false);
  const internalComments = ref<ZodFlawCommentType[]>([]);

  const publicComments = computed<ZodFlawCommentType[]>(() => flaw.value.comments.filter(filterFunctions.Public));
  const privateComments = computed<ZodFlawCommentType[]>(() => flaw.value.comments.filter(filterFunctions.Private));
  const systemComments = computed<ZodFlawCommentType[]>(() => flaw.value.comments.filter(filterFunctions.System));

  function loadInternalComments() {
    isLoadingInternalComments.value = true;

    if (!flaw.value.task_key) {
      internalCommentsAvailable.value = false;
      isLoadingInternalComments.value = false;
      return;
    }

    getJiraComments(flaw.value.task_key)
      .then((res) => {
        if (res.response.ok) {
          internalCommentsAvailable.value = true;
        }
        if (res.data.comments.length >= 0) {
          internalComments.value = parseJiraComments(res.data.comments);
        }
      })
      .catch((res) => {
        if (res?.response?.status === 404) {
          console.error('Error loading internal Jira comments: Task id not found.');
        } else {
          console.error('Error loading internal Jira comments');
        }
        internalCommentsAvailable.value = false;
      })
      .finally(() => {
        isLoadingInternalComments.value = false;
      });
  }

  function addFlawComment(comment: string, creator: string, type: string) {
    if (type !== 'Internal') {
      // Osidb Bugzilla comment
      addOsidbComment(comment, creator, type === 'Private');
    } else {
      // Internal Jira comment
      addInternalComment(comment);
    }
  }

  function addOsidbComment(comment: string, creator: string, isPrivate: boolean) {
    isSaving.value = true;
    postFlawComment(flaw.value.uuid, comment, creator, isPrivate, flaw.value.embargoed)
      .then(afterSaveSuccess)
      .finally(() => isSaving.value = false);
  }

  async function addInternalComment(comment: string) {
    if (!flaw.value.task_key) {
      return;
    }
    isSaving.value = true;
    postJiraComment(flaw.value.task_key, comment)
      .then(() => {
        loadInternalComments();
      })
      .finally(() => isSaving.value = false);
  }

  function parseJiraComments(comments: ZodFlawCommentType[]) {
    return comments.map((comment: any) => {
      return {
        creator: comment.author.name,
        created_dt: comment.created,
        text: comment.body,
      };
    }) as ZodFlawCommentType[];
  }

  return {
    publicComments,
    privateComments,
    internalComments,
    systemComments,
    addFlawComment,
    loadInternalComments,
    isLoadingInternalComments,
    internalCommentsAvailable,
  };
}

