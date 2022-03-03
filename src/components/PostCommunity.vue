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
      params: { communityName: postCommunity },
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
    //Allows to extract the Community the post belongs to. Defaults to blog otherwise.
    postCommunity(){
      const community = sanitizeHTML(this.post.content);
//      console.log(community.match('href="/c/([^"]*)')[1]);

      //Regexp the value to extract the community from the post if it exists, otherwise default it to general.
      if(community.match('href="/c/([^"]*)')){
//        console.log(community.match('href="/c/([^"]*)'));
        return community.match('href="/c/([^"]*)')[1];
      }else {
        return "general"
      }
    }
  }
}

</script>
