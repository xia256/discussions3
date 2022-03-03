<template>
  <v-card
    v-if="post"
    :data-post-id="post.id"
    class="post rounded-0"
  >
    <div v-bind="$attrs"
         v-html="sanitizedHtml"
         />
      <!--
        {{ post.content }}-->
  </v-card>
</template>
<script>
import { PostObject } from "../server/api/objects";

//Import SanitizeHTML in order to prepare the text for render.
import { thumbHTML } from "../utility";

export default {
  name: "PostThumb",
  props: {
    post: { type: PostObject, default: null},
  },
  computed: {
    sanitizedHtml(){
      //Sanitize the HTML code to eliminate the extra.
      const sanitized = thumbHTML(this.post.content);
      //Take only the first lines and display them as title.
      const thumbContent = sanitized.substring(0, 80);
      //Eliminate pictures.
      return thumbContent;
    }
  }
}
</script>
