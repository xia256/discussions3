<template>
  <v-card
    v-if="post"
    :data-post-id="post.id"
    class="post rounded-0"
    >
    {{ shortDateString }}
  </v-card>
</template>

<script>
import { PostObject } from "../server/api/objects";
import { shortDateString } from "../utility";

export default {
  name: "PostDate",
  props: {
    post: { type: PostObject, default: null},
  },
  computed: {
    shortDateString(){
      return shortDateString(this.post.updatedAt);
    }
  }
}
</script>
