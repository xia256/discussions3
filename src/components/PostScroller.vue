<template>
  <div>
    <v-row no-gutters>
      <v-col
        v-if="!noSubmitter"
        :cols="12"
      >
        <PostSubmitter
          :disabled="waiting"
          @submit="submitPost"
        />
      </v-col>
    </v-row>
    <SearchCursor
      ref="cursor"
      :advance-cursor="advanceCursorInternal"
    >
      <template v-slot:content="{ items }">
        <v-row
          v-for="(post, i) in items"
          :key="i"
          no-gutters
        >
          <v-col :cols="12">
            <Post
              class="mb-2"
              flat
              outlined
              :max-replies="2"
              :post="post.replyContext ? post.replyContext : post"
              :force-override-block="forceOverrideBlock"
            />
          </v-col>
        </v-row>
      </template>
    </SearchCursor>
  </div>
</template>

<script>
import { mapState } from "vuex";
import mixins from "../mixins";

import { PostObject } from "../server/api/objects";

//import { delay } from "../utility";

import SearchCursor from "../components/SearchCursor";
import Post from "../components/Post";
import PostSubmitter from "../components/PostSubmitter";

export default {
  name: "PostScroller",
  components: {
    SearchCursor,
    Post,
    PostSubmitter,
  },
  mixins: [mixins.Common, mixins.SubmitPost],
  props: {
    advanceCursor: { type: Function, required: true },
    noSubmitter: { type: Boolean, default: false },
    forceOverrideBlock: { type: Boolean, default: false },
  },
  data: () => ({}),
  computed: {
    ...mapState(['submittedPost'])
  },
  watch: {
    submittedPost() {
      if (this.noSubmitter) return;
      
      const post = this.submittedPost;
      if (!post) return;

      this.$refs.cursor.items.unshift(post);

      // clear
      this.$store.commit("set", ["submittedPost", null]);
    }
  },
  async created() {
  },
  beforeDestroy() {
  },
  methods: {
    async resetCursor() {
      return await this.$refs.cursor.resetCursor();
    },
    async advanceCursorInternal({ cursorId: oldCursorId, items: posts }) {
      return await this.wait(async () => {
        const { cursorId, results } = await this.advanceCursor({
          cursorId: oldCursorId,
        });

        // NOTE: consider lodash?
        function findLastIndex(array, predicate) {
          let l = array.length;
          while (l--) {
            if (predicate(array[l], l, array)) {
              return l;
            }
          }
          return -1;
        }

        let insertIndex = posts.length;
        const pendingCommit = new Set();
        const INSERT_INDEX_THRESHOLD = 10;

        const append = [];
        for (const post of results.map((dbo) => new PostObject(dbo))) {
          if (posts.some((p) => p.id == post.id)) continue; // duplicate?

          if (post.isNsfw) {
            if (!this.settings.allowNsfw && post.identityPublicKey != this.selfIdentityPublicKey) {
              continue; // skip post, it's nsfw and we don't want to see that
            }
          }

          const eci = findLastIndex(
            posts,
            (p) => p.id == post.threadId || p.replyContext?.id == post.threadId
          );

          if (eci > -1 && eci - insertIndex <= INSERT_INDEX_THRESHOLD) {
            const existing = posts[eci];
            existing.updateThreadMap(Object.values(post.threadMap), false);
            pendingCommit.add(eci);
            continue;
          }

          append.push(post);
          insertIndex++;
        }

        for (const index of pendingCommit) {
          const post = posts[index];
          post.updateThreadMap([], true, true);
        }

        return { cursorId, results: append };
      });
    }
  },
};
</script>