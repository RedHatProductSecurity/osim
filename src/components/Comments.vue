<template>
    <div class="mt-3">
      <h4>Comments</h4>
      <hr>
      <div v-for="(comment, index) in comments" :key="index" class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">{{ comment.name }}</h5>
          <p class="card-text">{{ comment.content }}</p>
        </div>
      </div>
      <div class="form-group">
        <label for="comment-name">Name:</label>
        <input type="text" class="form-control" id="comment-name" v-model="newCommentName">
      </div>
      <div class="form-group">
        <label for="comment-content">Comment:</label>
        <textarea class="form-control" id="comment-content" rows="3" v-model="newCommentContent"></textarea>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input" id="internal-comment" v-model="newCommentInternal">
        <label class="form-check-label" for="internal-comment">Internal Comment</label>
      </div>
      <button type="button" class="btn btn-primary mt-3" @click="addComment">Add Comment</button>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent } from 'vue'
  
  export default defineComponent({
    name: 'Comments',
    data() {
      return {
        comments: [
          {
            name: 'John Doe',
            content: 'This is the first comment.',
          },
          {
            name: 'Jane Smith',
            content: 'This is the second comment.',
          },
        ],
        newCommentName: '',
        newCommentContent: '',
        newCommentInternal: false,
      }
    },
    methods: {
      addComment() {
        const newComment = {
          name: this.newCommentName,
          content: this.newCommentContent,
        }
        this.comments.push(newComment)
        this.newCommentName = ''
        this.newCommentContent = ''
      },
    },
  })
  </script>
  