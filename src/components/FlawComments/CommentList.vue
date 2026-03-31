<script setup lang="ts">
import { ref, watch } from 'vue';

import { DateTime } from 'luxon';
import sanitizeHtml from 'sanitize-html';

import { CommentTypeDisplay } from '@/composables/useFlawCommentsModel';

import { CommentType, commentTooltips } from '@/constants';
import { getJiraUser, jiraUserUrl } from '@/services/JiraService';
import { osimRuntime } from '@/stores/osimRuntime';
import { type ZodFlawCommentType } from '@/types/zodFlaw';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  commentList: ZodFlawCommentType[];
}>();

const userDisplayNameCache: Record<string, string> = {};
const parsedComments = ref<string[]>([]);
const isParsingComments = ref(false);

function linkify(text: string) {
  const bugzillaLink = `${osimRuntime.value.backends.bugzilla}/show_bug.cgi?id=`;
  const bugzillaRegex = /\[bug (\d+)\]/g;
  // On-premise format: [display text|https://url]
  const jiraLinkRegex = /\[([^|\]]+)\|(https?:\/\/[^\]]+)\]/g;
  // Jira Cloud smart link format: [https://url|smart-link]
  const jiraSmartLinkRegex = /\[(https?:\/\/[^\]|]+)\|smart-link\]/g;

  return text
    .replace(bugzillaRegex, `<a target="_blank" href="${bugzillaLink}$1">[bug $1]</a>`)
    .replace(jiraSmartLinkRegex, '<a target="_blank" href="$1">$1</a>')
    .replace(jiraLinkRegex, '<a target="_blank" href="$2">$1</a>');
}

async function resolveAccountId(accountId: string): Promise<string> {
  if (userDisplayNameCache[accountId]) {
    return userDisplayNameCache[accountId];
  }
  const user = await getJiraUser(accountId);
  const displayName = user?.displayName ?? accountId;
  userDisplayNameCache[accountId] = displayName;
  return displayName;
}

async function parseJiraTags(text: string): Promise<string> {
  const jiraTagRegex = /\[~([^[\]]+)\]/g;
  const matches = [...text.matchAll(jiraTagRegex)];

  for (const [match, p1] of matches) {
    const accountIdMatch = p1.match(/^accountid:(.+)$/);
    if (accountIdMatch) {
      const accountId = accountIdMatch[1];
      const displayName = await resolveAccountId(accountId);
      const url = `${osimRuntime.value.backends.jiraDisplay}/jira/people/${accountId}`;
      text = text.replace(match, `<a target="_blank" href="${url}">@${displayName}</a>`);
    } else {
      const url = `${osimRuntime.value.backends.jiraDisplay}/ViewProfile.jspa?name=${p1}`;
      text = text.replace(match, `<a target="_blank" href="${url}">${p1}</a>`);
    }
  }
  return text;
}

watch(() => props.commentList, async (comments) => {
  isParsingComments.value = true;

  // Pre-resolve display names for internal comment authors (accountId → displayName)
  await Promise.all(
    comments
      .filter(c => c.type === CommentType.Internal && c.creator)
      .map(c => resolveAccountId(c.creator!)),
  );

  parsedComments.value = await Promise.all(
    comments.map(async (c) => {
      if (c.type === CommentType.Internal) {
        // renderedBody is pre-rendered HTML from Jira — only sanitize, skip wiki parsing
        return sanitizeHtml(c.text ?? '');
      }
      return parseJiraTags(linkify(sanitizeHtml(c.text ?? '')));
    }),
  );

  isParsingComments.value = false;
}, { immediate: true });

function getCommentTooltip(type: CommentType | undefined) {
  if (!type) {
    return '';
  }

  return commentTooltips[type];
}
</script>

<template>
  <ul class="comments list-unstyled">
    <li
      v-for="(comment, commentIndex) in commentList"
      :key="commentIndex"
      class="p-4 mt-3 rounded-2"
      :class="{
        'bg-light-green': comment.type === CommentType.Public,
        'bg-light-info': comment.type === CommentType.Private,
        'bg-light-orange': comment.type === CommentType.Internal,
        'bg-light-yellow': comment.type === CommentType.System,
      }"
    >
      <div class="d-flex border-bottom pb-3 align-items-center">
        <i class="bi bi-caret-right-fill me-2"></i>
        <a
          v-if="comment.type === CommentType.Internal"
          :href="jiraUserUrl(comment.creator || '')"
          target="_blank"
        >
          {{ comment.creator ? (userDisplayNameCache[comment.creator] ?? comment.creator) : '' }}
        </a>
        <span v-else>{{ comment.creator }}</span>
        - {{ DateTime.fromISO(comment.created_dt ?? '',{ setZone: true })
          .toFormat('yyyy-MM-dd hh:mm a ZZZZ') }}
        <span
          class="badge rounded-pill float-end ms-auto"
          style="font-size: 14px; cursor: help; user-select: none;"
          :title="getCommentTooltip(comment.type)"
          :class="{
            'bg-success': comment.type === CommentType.Public,
            'bg-info': comment.type === CommentType.Private,
            'bg-danger': comment.type === CommentType.Internal,
            'bg-warning text-black': comment.type === CommentType.System,
          }"
        >
          {{ CommentTypeDisplay(comment.type) }}
        </span>
      </div>
      <LoadingSpinner v-if="isParsingComments" type="border" class="mt-2" />
      <!--eslint-disable-next-line vue/no-v-html -->
      <p v-else class="osim-flaw-comment" v-html="parsedComments[commentIndex]" />
    </li>
  </ul>
</template>
