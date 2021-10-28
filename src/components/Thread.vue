<template>
  <div v-bind="$attrs">
    <v-progress-linear
      v-if="waiting"
      indeterminate
      color="primary"
      class="ml-2 mr-2"
    />
    <Post
      v-for="(p, i) in contextPosts"
      :key="p.id"
      flat
      outlined
      :post="p"
      :blocked="blocked"
      :no-replies="noReplies"
      :highlight="i == contextPosts.length - 1"
    />
    <PostSubmitter
      v-if="!noReplies"
      :disabled="waiting"
      @submit="submitPost"
    />
  </div>
</template>

<script>
import Post from "../components/Post";
import PostSubmitter from "../components/PostSubmitter";

import mixins from "../mixins";
import { delay, tryParseJson } from "../utility";

import api from "../server/api";
import { PostObject } from "../server/api/objects";

export default {
  name: "Thread",
  components: {
    Post,
    PostSubmitter,
  },
  mixins: [mixins.Common],
  props: {
    encodedId: { type: String, required: true },
    username: { type: String, required: true },
    noReplies: { type: Boolean, default: false },
    value: { type: Array, default: () => [] },
  },
  data: () => ({
    decodedId: { shortId: "", createdAt: 0 },
    cursorId: null,
    contextPosts: [],
    blocked: [],
  }),
  computed: {},
  watch: {
    isLoggedIn() {
      this.loadStatus();
    },
    encodedId() {
      this.loadStatus();
    },
  },
  async created() {},
  async mounted() {
    this.loadStatus();
  },
  async beforeDestroy() {},
  methods: {
    async submitPost(editor) {
      const statusPost = this.contextPosts[this.contextPosts.length - 1];
      const threadId = statusPost.threadId;
      const parentId = statusPost.id;

      const { post: refPost, transfers } = await editor.submitPost({
        threadId,
        parentId,
        allowTransfers: true,
      });
      if (refPost) {
        editor.clear();

        const { shortId, createdAt } = PostObject.decodeId(
          refPost.getEncodedId()
        );

        const post = new PostObject(
          await api.Search.getSinglePost({
            username: refPost.username,
            shortId,
            createdAt: createdAt.getTime(),
          })
        );

        statusPost.directReplies.push(post);

        for (const _transfers of Object.values(transfers)) {
          let parentTips = _transfers
            .map((t) => ({
              ...t,
              metadata: tryParseJson(t.metadata),
              txid: "",
            }))
            .filter(
              (t) =>
                t.metadata?.recipientIdentity == statusPost.identityPublicKey
            );

          statusPost.tips.push(...parentTips);
        }
      }
    },
    async loadStatus() {
      if (!this.encodedId || !this.username) {
        this.contextPosts = [];
        this.cursorId = null;
        return;
      }

      await this.wait(async () => {
        this.decodedId = PostObject.decodeId(this.encodedId);

        if (this.isLoggedIn) {
          await this.waitForLoginFinish();

          const account = await api.Search.getUserInfo();
          this.blocked = account.blocked ?? [];
        }

        const posts = [];
        do {
          const { cursorId, results } = await api.Search.getThread({
            cursorId: this.cursorId,
            username: this.username,
            shortId: this.decodedId.shortId,
            createdAt: this.decodedId.createdAt.getTime(),
          });

          posts.push(...results.map((p) => new PostObject(p)));

          this.cursorId = cursorId;
          await delay(10);
        } while (this.cursorId);

        let walk = null;

        for (const post of Object.values(posts)) {
          if (
            post.username == this.username &&
            post.id.startsWith(this.decodedId.shortId)
          ) {
            walk = post;
            break;
          }
        }

        walk.relativeDepth = 0; // force set this
        walk.updateThreadMap(posts);

        // walk the thread for the context
        const contextPosts = [];

        while (walk) {
          contextPosts.unshift(walk);
          walk = posts.find((p) => p.id == walk.parentId);
          // clear cause we don't need for context
          if (walk) walk.directReplies = [];
        }

        this.contextPosts = contextPosts;
        this.$emit("input", this.contextPosts);

        console.log(
          `Viewing thread`,
          this.contextPosts[this.contextPosts.length - 1]
        );
      });
    },
  },
};
</script>