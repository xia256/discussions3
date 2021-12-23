<template>
  <v-card
    v-if="post"
    :data-post-id="post.id"
    class="post rounded-0"
  >
    <div v-bind="$attrs"
         v-html="sanitizedHtml"
         />
  </v-card>

</template>
<script>
import { PostObject } from "../server/api/objects";

//Import SanitizeHTML in order to prepare the text for render.
import { thumbImgHTML } from "../utility";

export default {
  name: "PostThumb",
  props: {
    post: { type: PostObject, default: null},
  },
  computed: {
    
    sanitizedHtml(){
      //Sanitize the HTML code to eliminate the extra.
      const sanitized = thumbImgHTML(this.post.content);
      //console.log(this.post);
      return sanitized;
    }
  }
}

</script>
