<script setup lang="ts">
import { DateTime } from 'luxon';
import sanitizeHtml from 'sanitize-html';

import { CommentTypeDisplay } from '@/composables/useFlawCommentsModel';

import { type ZodFlawCommentType } from '@/types/zodFlaw';
import { CommentType } from '@/types';
import { jiraUserUrl } from '@/services/JiraService';
import { commentTooltips } from '@/constants';
import { osimRuntime } from '@/stores/osimRuntime';

defineProps<{
  commentList: ZodFlawCommentType[];
}>();

const parseCommentDisplayText = (text: string) => parseJiraTags(linkify(sanitizeHtml(text)));

function linkify(text: string) {
  const bugzillaLink = `${osimRuntime.value.backends.bugzilla}/show_bug.cgi?id=`;

  const bugzillaRegex = /\[bug (\d+)\]/g;
  const jiraRegex = /\[([^|]+)\|([^\]]+)\]/g;

  return text
    .replace(bugzillaRegex, `<a target="_blank" href="${bugzillaLink}$1">[bug $1]</a>`)
    .replace(jiraRegex, '<a target="_blank" href="$2">$2</a>');
}

function parseJiraTags(text: string) {
  const jiraUserLink = `${osimRuntime.value.backends.jiraDisplay}/ViewProfile.jspa?name=`;
  const jiraTagRegex = /\[~([^[\]]+)\]/g;

  return text
    .replace(jiraTagRegex, (match, p1) => `<a target="_blank" href="${jiraUserLink}${p1}">${p1}</a>`);
}

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
          {{ comment.creator }}
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
      <!--eslint-disable-next-line vue/no-v-html -->
      <p class="osim-flaw-comment" v-html="parseCommentDisplayText(comment.text ?? '')" />
    </li>
  </ul>
</template>
