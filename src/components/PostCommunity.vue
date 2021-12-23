<template>
<span v-if="post"
  :data-post-id="post.id"
  class="post rounded-0"
  >
  <router-link
    text
    small
    dense
    class="d-inline-block mr-2 font-weight-bold text-decoration-none"
    :to="{
      name: 'viewcommunity',
      params: { communityName: post.community },
    }"
  >
  <div v-bind="$attrs"        
       v-html="postCommunity"
         />

  </router-link>
</span>
</template>
<script>
import { PostObject } from "../server/api/objects";
import { sanitizeHTML } from "../utility";

export default {
  name: "PostCommunity",
  props: {
    post: { type: PostObject, default: null},
  },
  computed: {
    postCommunity(){
      const community = sanitizeHTML(this.post.content);
      console.log(community);
      return community;
    }
  }
}

</script>
