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
            <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
            %%%%%%%% MODIFIED HERE FOR VIEWS %%%%%%%
            %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
            <div v-if="settings.view == 'Classic'">
                <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
                %%%% IMPORTANT - THIS LOADS THE POSTS %%%
                %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
                <Post
                  class="mb-2"
                  flat
                  outlined
                  :max-replies="2"
                  :post="post.replyContext ? post.replyContext : post"
                  :force-override-block="forceOverrideBlock"
                />

            </div>

            <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
            <!--This will load the Reddit like view-->
            <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
            <div v-if="settings.view == 'Light'">
                <v-col :cols="12">
                  <div class="container">
                      <div class="left">
                         <v-btn
                            text
                            small
                            dense
                            class="pa-0"
                            :color="post.isLiked ? 'red' : 'tertiary'"
                            @click="likePost"
                          >
                            <v-icon>mdi-heart-outline</v-icon>
                            <span v-if="!settings.neutralEngagement">{{
                              post.totalLikes
                            }}</span>
                          </v-btn>

                          <!--Show the number of upvotes-->
                          {{ post.totalReplies }}

                      </div>

                      <div class="right">

                          <!--Show if post has been tipped-->
                          <div v-if="post.tips.length > 0" class="mb-1">
                            <PostTips :tips="post.tips" />
                          </div>

                          <!--Show post title or content-->
                          <div @click="openThread(post)">
                              <h4 v-if="post.title">{{ post.title }}</h4>
                              <!--TODO: Load only the excerpt from the post.content here if there's no title-->
                              <h4 v-if="!post.title">
                                <!--This control loads a small excerpt from a post without starting header/title.-->
                                <PostThumb :post="post.replyContext ? post.replyContext : post"></PostThumb>
                              </h4>
                          </div>

                          <!--Show username of the poster-->
                          <span>@{{ post.username }}</span>
                          <span>
                            <PostDate :post="post.replyContext ? post.replyContext : post"></PostDate>
                          </span>

                      </div>
                  </div>
                </v-col>
            </div>

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

//Action Commitment for the likePost utility.
import { getActionCommitment } from "../utility";
import PostTips from "./PostTips";

import SearchCursor from "../components/SearchCursor";
import Post from "../components/Post";
import PostSubmitter from "../components/PostSubmitter";

//Import to get short Post Date.
import PostDate from "../components/PostDate";
//Import to load partial content from the text in case there's no title.
import PostThumb from "../components/PostThumb.vue";

//Server API to make calls to the backend.
import api from "../server/api";

export default {
  name: "PostScroller",
  components: {
    SearchCursor,
    Post,
    PostSubmitter,
    PostTips,
    PostDate,
    PostThumb,
  },
  mixins: [mixins.Common, mixins.SubmitPost],
  props: {
    post: { type: PostObject, default: null },
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
    },

    //Function to like a published post without having to open it.
    async likePost() {
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;
                                                                                 
      const identityKey = this.keyManager.keys["identity"];
      if (this.post.identityPublicKey == identityKey.pub && this.post.isLiked)
        return;
                                                                                 
      await this.wait(async () => {
        const inverted = this.post.isLiked ? false : true;
                                                                                 
        // be optimistic about this and set it before signing and api call
        this.post.isLiked = inverted;
        this.post.totalLikes += inverted ? 1 : -1;
                                                                                 
        const args = {
          identityPublicKey: identityKey.pub,
          postId: this.post.id,
          value: inverted,
          nonce: Date.now(),
        };
                                                                                 
        const commitment = await getActionCommitment({ name: "like", ...args });
        const signature = await identityKey.signText(commitment);
                                                                                 
        await api.Action.likePost({
          signature,
          ...args,
        });
      });
    },

  },
};
</script>
