<template>
  <v-card
    v-bind="$attrs"
    flat
    class="rounded-0 pb-2"
  >
    <ContentEditor
      ref="editor"
      v-model="contentState"
      flat
    />
    <v-card-text
      v-show="resultText"
      class="pt-0 pb-0 text-center"
    >
      <ResultText :text="resultText" />
    </v-card-text>
    <v-card-actions>
      <v-row>
        <v-col :cols="cancelable ? 6 : 12">
          <v-btn
            :disabled="waiting || disabled || !isPostable"
            rounded
            color="primary"
            block
            @click="submit"
          >
            <v-progress-circular
              v-if="waiting"
              class="mr-2"
              indeterminate
            />
            {{ submitText || "Post" }}
          </v-btn>
        </v-col>
        <v-col
          v-if="cancelable"
          :cols="6"
        >
          <v-btn
            rounded
            outlined
            block
            @click="() => $emit('cancel', this)"
          >
            Cancel
          </v-btn>
        </v-col>
      </v-row>
    </v-card-actions>
  </v-card>
</template>

<script>
import api from "../server/api";
import { PostObject } from "../server/api/objects";

import {
  generateUUID,
  getActionCommitment,
  parseDocument,
  //delay,
} from "../utility";

import mixins from "../mixins";
import ContentEditor from "./ContentEditor";
import ResultText from "./ResultText";

export default {
  name: "PostSubmitter",
  components: {
    ContentEditor,
    ResultText,
  },
  mixins: [mixins.Common],
  props: {
    disabled: Boolean,
    cancelable: Boolean,
    submitText: { type: String, default: "" },
    initialValue: { type: String, default: "" },
  },
  data: () => ({
    resultText: "",
    contentState: "",
  }),
  computed: {
    isPostable() {
      return this.contentState?.length >= 5;
    },
  },
  watch: {},
  async created() {},
  async mounted() {
    if (this.initialValue) {
      this.setHTML(this.initialValue);
    }
  },
  async beforeDestroy() {},
  methods: {
    setHTML(html) {
      this.contentState = html;
    },
    clear() {
      this.$refs.editor.clear();
    },
    async submit() {
      if (this.requireLoginDialog()) return;
      this.$emit("submit", this);
    },
    async submitPost({ id, parentId, threadId, allowTransfers } = {}) {
      return await this.wait(async () => {
        this.resultText = "";

        try {
          // trigger the link processing if need be

          let transfers = {};
          let {
            html,
            hashtags,
            mentions: usernames,
          } = this.$refs.editor.getState();

          const hashtagRegexP = /#[0-9A-Za-z_]*<\/p>$/i;
          html = html.replace(hashtagRegexP, function (old) {
            const tag = old.substring(1, old.length - 4);
            const link = window._domFixer.mentionLink("#", tag);
            return (
              `<span class="mention" data-denotation-char="#" data-value="">&#xFEFF;<span><span class="ql-mention-denotation-char">#</span><a href="${link}">${tag}</a></span>&#xFEFF;</span>` +
              `</p>`
            );
          });

          if (allowTransfers && hashtags.includes("tip")) {
            const transferData = [];
            const document = parseDocument(html);
            const plainText = document.body.innerText;
            const matches = plainText.match(
              /#tip[\s|\uFEFF]+[0-9]+(.[0-9]+)?\s[A-Z]{3,6}([\s|\uFEFF]+@[A-Z0-9_]{3,})?/gi
            );

            if (matches && matches.length > 0) {
              const parent = new PostObject(
                await api.Search.getSinglePost({ id: parentId })
              );
              const parentUser = await api.Search.getUserInfo({
                identityPublicKey: parent.identityPublicKey,
              });

              for (const [, quantity, symbol, recipientUsername] of matches.map(
                (m) => m.replace(/\uFEFF/g, "").split(" ")
              )) {
                let recipient = parentUser;
                if (recipientUsername) {
                  recipient = await api.Search.getUserInfo({
                    username: recipientUsername.substring(1),
                  });
                }
                transferData.push({
                  symbol,
                  quantity,
                  amount: await this.createAsset(quantity, symbol),
                  recipient: recipient,
                });
              }
            }

            transfers = await this.signTransfers(transferData, parentId);
          }

          id = id ?? generateUUID();

          const identityKey = this.keyManager.keys["identity"];
          const mentions = await api.Action.getIdentities({ usernames });
          const args = {
            id,
            content: html,
            parentId,
            threadId: threadId ?? id,
            community: this.$route.params.communityName ?? "",
            identityPublicKey: identityKey.pub,
            mentions,
            hashtags,
            nonce: Date.now(),
            transfers,
          };

          const commitment = await getActionCommitment({
            name: "post",
            ...args,
          });

          const signature = await identityKey.signText(commitment);

          /*if (window) {
            console.log(html);
            console.log(hashtags);
            console.log(mentions);
            throw new Error("debug stop");
          }*/

          const post = new PostObject(
            await api.Action.createPost({
              signature,
              ...args,
            })
          );

          return { post, transfers };
        } catch (ex) {
          this.resultText = ex.toString();
          return {};
        }
      });
    },
  },
};
</script>
