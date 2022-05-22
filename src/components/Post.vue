<template>
  <v-card
    v-if="post"
    :data-post-id="post.id"
    class="post rounded-0"
    :class="{ 'post--embedded': embedded }"
    v-bind="$attrs"
    flat
    :outlined="$attrs.outlined != undefined || embedded"
    :rounded="embedded"
  >
    <div class="d-flex">
      <div v-if="reply" style="flex-basis: 12px">
        <div
          :class="{
            post__leftborder: true,
            'post__leftborder-indirect': indirect,
          }"
          @click="hideContent = !hideContent"
        />
      </div>
      <div
        class="flex-grow-1"
        style="max-width: calc(100%)"
        :class="{ post__topborder: reply }"
      >
        <v-card-text
          v-if="post"
          class="pb-1 pt-1 d-inline-block post__text"
          :class="{ 'post__text--highlight': highlight, 'pa-1': isMobile }"
        >
          <v-row v-if="isBlocked" no-gutters>
            <v-col :cols="12">
              <div class="d-flex align-center w-512px">
                <span v-show="isBlocked == 1" class="mr-2">
                  This post is from a blocked account.
                </span>
                <span v-show="isBlocked == 2" class="mr-2">
                  This post has been ignored.
                </span>
                <span v-show="isBlocked == 3" class="mr-2">
                  This post contains a blocked hash tag.
                </span>
                <v-btn class="pa-0" small text @click="overrideBlock = true">
                  View
                </v-btn>
              </div>
            </v-col>
          </v-row>
          <v-row v-show="!isBlocked" no-gutters>
            <v-col :cols="12">
              <div class="mb-1">
                <Avatar
                  v-if="!noAvatar"
                  class="d-inline mr-2"
                  :src="post.avatar"
                />
                <router-link
                  text
                  small
                  dense
                  class="
                    d-inline-block
                    mr-2
                    font-weight-bold
                    text-decoration-none
                  "
                  :to="{
                    name: 'profile',
                    params: { username: post.username },
                  }"
                  @mouseover.native="
                    (e) => openProfilePopover(e, post.username)
                  "
                >
                  <span>@{{ post.username }}</span>
                </router-link>
                <v-tooltip right>
                  <template v-slot:activator="{ on, attrs }">
                    <span
                      class="d-inline-block tertiary--text mr-2"
                      v-bind="attrs"
                      v-on="on"
                    >
                      {{ shortDateString }}
                    </span>
                  </template>
                  <span>{{ fullDateString }}</span>
                </v-tooltip>
                <span v-if="post.pinned" class="mr-2">
                  <v-icon class="success--text">mdi-pin</v-icon>
                </span>
                <a
                  class="
                    d-inline-block
                    text-decoration-none
                    tertiary--text
                    mr-2
                  "
                  href="javascript:void(0)"
                  @click="hideContent = !hideContent"
                  >[ {{ hideContent ? "+" : "-" }} ]</a
                >
              </div>
              <div v-if="post.tips.length > 0" class="mb-1">
                <PostTips :tips="post.tips" />
              </div>
              <v-expand-transition>
                <div v-if="isEditing">
                  <v-row no-gutters>
                    <v-col :cols="12">
                      <PostSubmitter
                        :disabled="waiting"
                        :initial-value="post.content"
                        cancelable
                        submit-text="save"
                        @submit="editPost"
                        @cancel="isEditing = false"
                      />
                    </v-col>
                  </v-row>
                </div>
                <div v-else>
                  <SanitizedHtml
                    v-show="!hideContent"
                    ref="postContent"
                    :data-oembed="embedded ? 1 : 0"
                    :class="[
                      `post__content`,
                      contentClass,
                      post.isNsfw && settings.blurNsfw
                        ? 'post__content--blur'
                        : '',
                      isMobile ? 'pl-1' : '',
                    ]"
                    :html="post.content"
                  />
                  <v-btn
                    v-show="!hideContent"
                    block
                    text
                    dense
                    small
                    class="mt-n7"
                    @click="showOverflow()"
                  >
                    Show more
                  </v-btn>
                </div>
              </v-expand-transition>
              <v-row no-gutters class="ml-n2">
                <v-col class="d-flex">
                  <v-btn
                    text
                    small
                    dense
                    class="pa-0"
                    color="tertiary"
                    @click="openThread(post)"
                  >
                    <v-icon>mdi-chat-outline</v-icon>
                    {{ post.totalReplies }}
                  </v-btn>
                  <!-- retweet/share menu (...) -->
                  <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        text
                        small
                        dense
                        class="pa-0"
                        color="tertiary"
                        v-bind="attrs"
                        v-on="on"
                      >
                        <v-icon>mdi-repeat-variant</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item>
                        <v-btn text block @click="socialShare('self')">
                          <v-icon class="mr-2"> mdi-repeat-variant </v-icon>
                          <span>Share</span>
                        </v-btn>
                      </v-list-item>
                      <v-list-item>
                        <v-btn text block @click="socialShare('twitter')">
                          <v-icon class="mr-2"> mdi-twitter </v-icon>
                          <span>Twitter</span>
                        </v-btn>
                      </v-list-item>
                    </v-list>
                  </v-menu>
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

                  <div class="d-inline" :class="{ 'flex-grow-1': isMobile }" />
                  <!-- drop down menu (...) -->
                  <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        text
                        small
                        dense
                        class="pa-0"
                        color="tertiary"
                        v-bind="attrs"
                        v-on="on"
                      >
                        <v-icon>mdi-dots-horizontal</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item>
                        <v-btn text block @click="tipPost">
                          <v-icon>mdi-wallet</v-icon>
                          <span>Tip</span>
                        </v-btn>
                      </v-list-item>
                      <v-list-item v-if="isGlobalModerator">
                        <v-btn text block @click="pinPost">
                          <v-icon>mdi-pin</v-icon>
                          <span>{{ post.pinned ? "Unpin" : "Pin" }}</span>
                        </v-btn>
                      </v-list-item>
                      <v-list-item
                        v-show="
                          isLoggedIn &&
                          post.identityPublicKey == selfIdentityPublicKey
                        "
                      >
                        <v-btn text block @click="isEditing = true">
                          <v-icon class="mr-2"> mdi-pencil </v-icon>
                          <span>Edit</span>
                        </v-btn>
                      </v-list-item>
                      <v-list-item>
                        <v-btn text block @click="ignorePost">
                          <v-icon class="mr-2"> mdi-block-helper </v-icon>
                          <span>{{
                            post.ignoredBy.includes(selfIdentityPublicKey)
                              ? "Unhide"
                              : "Hide"
                          }}</span>
                        </v-btn>
                      </v-list-item>
                      <v-list-item>
                        <v-btn text block @click="flagNsfwPost">
                          <v-icon class="mr-2"> mdi-alert </v-icon>
                          <span>{{
                            post.flaggedNsfwBy.includes(selfIdentityPublicKey)
                              ? "Unflag NSFW"
                              : "Flag NSFW"
                          }}</span>
                        </v-btn>
                      </v-list-item>

                      <v-list-item>
                        <!--Button added to quickly block an user.-->
                        <v-btn
                          text
                          block
                          class="pa-0"
                          @click="blockAccount(post)">
                          Hide User
                        </v-btn>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card-text>

        <v-expand-transition class="flex-grow-1">
          <div class="pb-2">
            <v-btn
              v-show="
                post.relativeDepth >= depthLimit &&
                post.directReplies.length > 0
              "
              color="tertiary"
              text
              @click="openThread(post)"
            >
              continue thread
            </v-btn>
            <div
              v-if="!noReplies"
              v-show="
                !hideContent &&
                post.directReplies.length > 0 &&
                post.relativeDepth < depthLimit
              "
              class="replies"
            >
              <div
                v-for="(replyPost, i) in post.directReplies.slice(
                  0,
                  maxShowReplies ? maxShowReplies : post.directReplies.length
                )"
                :key="i"
                class="reply"
              >
                <Post
                  reply
                  :max-replies="maxReplies"
                  flat
                  :post="replyPost"
                  :blocked="blocked"
                  :force-override-blocked="forceOverrideBlock"
                />
              </div>

              <v-btn
                v-if="
                  maxShowReplies && post.directReplies.length > maxShowReplies
                "
                text
                color="tertiary"
                class="pa-0 ml-n1"
                @click="showMoreReplies()"
              >
                More
              </v-btn>
            </div>
            <div
              v-if="!noReplies"
              v-show="!hideContent && post.indirectReplies.length > 0"
              class="replies"
            >
              <v-btn
                color="tertiary"
                text
                class="pa-0 ml-n1"
                @click="showFullContext()"
              >
                <v-icon>mdi-dots-vertical</v-icon>
                <span>load context</span>
              </v-btn>
              <div
                v-for="(replyPost, i) in post.indirectReplies"
                :key="i"
                class="reply"
              >
                <Post
                  indirect
                  reply
                  :max-replies="maxReplies"
                  flat
                  :post="replyPost"
                  :blocked="blocked"
                  :force-override-blocked="forceOverrideBlock"
                />
              </div>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>
  </v-card>
</template>

<style lang="scss">
.post--embedded {
  margin-top: 8px;
  max-width: 512px !important;
}

.post__text--highlight {
  background-color: rgba(215, 218, 220, 0.15);
}

.post {
  max-width: 100%;
  width: 100%;

  .post__topborder {
    border-top: 1px dashed $hiki-tertiary-color;
  }

  .post__leftborder {
    cursor: pointer;
    max-width: 3px;
    border-right: 3px dashed $hiki-tertiary-color;
    height: 100%;
    margin-left: 6px;
  }

  .post__leftborder-indirect {
    border-right: 3px dashed $hiki-tertiary-color;
  }

  .post__context {
    cursor: pointer;
    max-width: 3px;
    border-right: 3px dashed $hiki-tertiary-color;
    height: 100%;
    margin-left: 14px;
  }

  .post__content {
    max-height: 420px;
    overflow-y: hidden;
    white-space: pre-wrap;

    + {
      button {
        display: none;
      }
    }

    img:not(.v-avatar--img),
    iframe,
    video {
      min-width: 0px !important; /* instagram override */
      max-width: min(100%, 512px) !important;
      display: block;
      padding-bottom: 10px;
    }

    blockquote {
      border-left: 4px solid #ccc;
      margin-bottom: 5px;
      margin-top: 5px;
      padding-left: 16px;
    }
    pre {
      white-space: pre-wrap;
      margin-bottom: 5px;
      margin-top: 5px;
      padding: 5px 10px;
      background-color: #23241f;
      color: #f8f8f2;
      overflow: visible;
    }
    .mention {
      font-weight: bolder;
      color: $hiki-mention-color !important;
      text-decoration: none;

      a {
        color: $hiki-mention-color !important;
        text-decoration: none;
      }
    }
  }

  .post__content--faded {
    + {
      button {
        display: unset;
      }
    }

    &:after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-image: linear-gradient(
        rgba(255, 255, 255, 0) 50%,
        $hiki-background-color 100%
      );
    }
  }

  .post__content--nofaded {
    max-height: unset;
    /* remove the .post_content--blur effects */
    pointer-events: unset !important;
    filter: unset !important;
  }

  .post__content--blur {
    filter: blur(20px);
    pointer-events: none;
  }
}
</style>

<script>
import mixins from "../mixins";
import { PostObject } from "../server/api/objects";
import { shortDateString, getActionCommitment, Timer } from "../utility";

import api from "../server/api";

import Avatar from "./Avatar";
import SanitizedHtml from "./SanitizedHtml";
import PostSubmitter from "./PostSubmitter";
import PostTips from "./PostTips";

export default {
  name: "Post",
  components: {
    Avatar,
    SanitizedHtml,
    PostSubmitter,
    PostTips,
  },
  mixins: [mixins.Common],
  props: {
    post: { type: PostObject, default: null },
    maxReplies: { type: Number, default: 0 },
    reply: { type: Boolean, default: false },
    indirect: { type: Boolean, default: false },
    noAvatar: { type: Boolean, default: false },
    noReplies: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false },
    contentClass: { type: String, default: "" },
    highlight: { type: Boolean, default: false },
    blocked: { type: Array, default: () => [] },
    forceOverrideBlock: { type: Boolean, default: false },
  },
  data: () => ({
    hideContent: false,
    overrideBlock: false,
    maxShowReplies: 0,
    isEditing: false,
    //Profile account data for user management in post.
    profileAccount: null,
  }),
  computed: {
    isBlocked() {
      if (this.overrideBlock) return 0;

      const post = this.post;
      if (!post) return 0;
      if (post.isIgnored) return 2;
      if (this.blocked.some((idpk) => post.identityPublicKey == idpk)) return 1;
      if (
        this.post.hashtags.some((ht) => this.settings.blockedTags.includes(ht))
      )
        return 3;

      return 0;
    },
    overflowedContent() {
      const $el = this.$refs.postContent.$el;
      if (!$el) return false;
      //console.log($el.scrollHeight, $el.clientHeight);
      return $el.scrollHeight > $el.clientHeight;
    },
    depthLimit() {
      return this.isMobile ? 5 : 9;
    },
    shortDateString() {
      return shortDateString(this.post.updatedAt);
    },
    fullDateString() {
      return this.post.updatedAt.toLocaleString();
    },
  },
  watch: {
    maxReplies() {
      this.maxShowReplies = this.maxReplies;
    },
  },
  async created() {
    this.overrideBlock = this.forceOverrideBlock;
  },
  async mounted() {
    this.maxShowReplies = this.maxReplies;
    this.startObserver();

    this.$nextTick(() => {
      window._domFixer?.postOEmbed?.(this.$el);
      window._domFixer?.postMentions?.(this.$el);
    });
  },
  async beforeDestroy() {
    this._observer?.disconnect();
  },
  methods: {
    startObserver() {
      if (this.isIOS) {
        // use a polling mechanism to check for dynamic content
        let n = 0;
        let clientHeight = 0;
        Timer.start(500, async () => {
          if (++n >= 5) return 0;
          //if (this.post.id != "dee6f754-5068-46d9-be87-228e00682a17") return 0;
          if (this.$el.clientHeight != clientHeight) {
            clientHeight = this.$el.clientHeight;
            window._domFixer?.postContent(this.$el);
          }
          return 500;
        });
      } else {
        const observer = new ResizeObserver(() => {
          window._domFixer?.postContent(this.$el);
        });
        observer.observe(this.$el);
        this._observer = observer;
      }
    },
    async socialShare(social) {
      const postLink = `${window.location.origin}${this.post.getLink()}`;

      if (social == "self") {
        return this.openDialog("submitpost", {
          initialContent: `<a href="${postLink}">${postLink}</a> \r\n\r\n`,
        });
      }

      let url = "";
      let features = undefined;

      if (social == "twitter") {
        const tweet = `${postLink} ${this.post.hashtags
          .map((ht) => `#${ht}`)
          .join(" ")}`;
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          tweet
        )}`;
        features =
          "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=600,height=600";
      }

      if (url) return window.open(url, "", features);
    },
    async tipPost() {
      this.openDialog('sendtip', {
        post: this.post
      });
    },
    async pinPost() {
      const pinned = this.post.pinned ? 0 : 1; // new value

      await api.Action.pinPost({
        id: this.post.id,
        identityPublicKey: this.selfIdentityPublicKey,
        pinned,
      });

      this.post.pinned = pinned;
    },
    async editPost(editor) {
      const { post: result } = await editor.submitPost({
        id: this.post.id,
        parentId: this.post.parentId,
        threadId: this.post.threadId,
      });

      if (result) {
        const { content, plainText, mentions, hashtags } = result;
        const p = this.post;

        p.content = content;
        p.plainText = plainText;
        p.mentions = mentions;
        p.hashtags = hashtags;

        this.isEditing = false;
      }
    },
    async showOverflow() {
      const $el = this.$refs.postContent.$el;
      if (!$el) return;
      $el.classList.add("post__content--nofaded");
      $el.classList.remove("post__content--faded");
    },
    async showFullContext() {
      const post = this.post;
      if (!post) return;
      if (post.indirectReplies.length == 0) return;

      const context = await api.Search.getThreadContext({
        id: post.id,
        threadId: post.threadId,
        indirectParentIds: post.indirectReplies.map((idr) => idr.parentId),
      });

      post.updateThreadMap(context.map((p) => new PostObject(p)));
    },
    showMoreReplies() {
      this.maxShowReplies = Math.floor(this.maxShowReplies * 2);
    },
    async flagNsfwPost() {
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;

      const identityKey = this.keyManager.keys["identity"];

      await this.wait(async () => {
        const inverted = this.post.flaggedNsfwBy.includes(identityKey.pub)
          ? false
          : true;

        // be optimistic about this and set it before signing and api call
        if (inverted) this.post.flaggedNsfwBy.push(identityKey.pub);
        else
          this.post.flaggedNsfwBy = this.post.flaggedNsfwBy.filter(
            (idpk) => idpk != identityKey.pub
          );

        const args = {
          identityPublicKey: identityKey.pub,
          postId: this.post.id,
          value: inverted,
          nonce: Date.now(),
        };

        const commitment = await getActionCommitment({
          name: "nsfw-post",
          ...args,
        });
        const signature = await identityKey.signText(commitment);

        await api.Action.flagNsfwPost({
          signature,
          ...args,
        });
      });
    },
    async ignorePost() {
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;

      const identityKey = this.keyManager.keys["identity"];

      await this.wait(async () => {
        const inverted = this.post.ignoredBy.includes(identityKey.pub)
          ? false
          : true;

        // be optimistic about this and set it before signing and api call
        if (inverted) this.post.ignoredBy.push(identityKey.pub);
        else
          this.post.ignoredBy = this.post.ignoredBy.filter(
            (idpk) => idpk != identityKey.pub
          );

        const args = {
          identityPublicKey: identityKey.pub,
          postId: this.post.id,
          value: inverted,
          nonce: Date.now(),
        };

        const commitment = await getActionCommitment({
          name: "ignore-post",
          ...args,
        });
        const signature = await identityKey.signText(commitment);

        await api.Action.ignorePost({
          signature,
          ...args,
        });
      });
    },
    async blockAccount(spost) {
      var username = spost.username;
      this.profileAccount = await api.Search.getUserInfo({ username });

      //console.log(this.profileAccount);
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;

      const blockPublicKey = this.profileAccount?.identityPublicKey;
      if (!blockPublicKey) return;
      

      const identityKey = this.keyManager.keys['identity'];
      if (this.profileAccount.identityPublicKey == identityKey.pub) return;

      await this.wait(async () => {
        const inverted = this.profileAccount.isBlocked ? false : true;

        // be optimistic about this and set it before signing and api call
        this.profileAccount.isBlocked = inverted;

        var args = {
          identityPublicKey: identityKey.pub,
          blockPublicKey,
          value: inverted,
          nonce: Date.now(),
        };

        var commitment = await getActionCommitment({
          name: "block",
          ...args,
        });
        var signature = await identityKey.signText(commitment);

        await api.Action.blockUser({
          signature,
          ...args,
        });

      });
    },

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
