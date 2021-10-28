<template>
  <SearchCursor
    ref="cursor"
    :advance-cursor="getActiveChats"
  >
    <template v-slot:content="{ items: msgs }">
      <v-card
        v-for="(msg, i) in msgs"
        :key="i"
        flat
        class="mb-4"
        @click="$emit('click-message', msg)"
      >
        <v-row no-gutters>
          <v-col
            cols="auto"
            class="d-flex align-center ml-2"
          >
            <Avatar
              :size="24"
              :src="msg.contactInfo.avatar"
            />
          </v-col>
          <v-col class="d-flex flex-shrink-1 overflow-hidden">
            <div class="ml-1 w-95">
              <span class="d-block">@{{ msg.contactInfo.username }}</span>
              <span class="d-block tertiary--text chat__message--preview">{{
                msg.content
              }}</span>
            </div>
          </v-col>
          <v-col
            cols="auto"
            class="d-flex justify-end align-start"
          >
            <span
              class="mr-4 mt-1"
              style="font-size: 11px"
            >{{
              shortDateString(msg.createdAt)
            }}</span>
          </v-col>
        </v-row>
      </v-card>
    </template>
  </SearchCursor>
</template>

<script>
import api from "../server/api";

import mixins from "../mixins";

import { shortDateString } from "../utility";

import SearchCursor from "../components/SearchCursor";
import Avatar from "../components/Avatar";

export default {
  name: "ActiveMessengerChats",
  components: {
    SearchCursor,
    Avatar,
  },
  mixins: [mixins.Common],
  props: {
      limit: { type: Number, default: 0 }
  },
  data: () => ({}),
  computed: {
      items() {
          return this.$refs.cursor.items;
      }
  },
  watch: {},
  async created() {},
  async mounted() {
    await this.waitForLoginFinish();
    api.Action.seenDirectMessages();
    this.$store.commit("set", ["hasUnreadMessages", false]);
  },
  async beforeDestroy() {
    api.Action.seenDirectMessages();
  },
  methods: {
    shortDateString,
    async getActiveChats({ cursorId: oldCursorId }) {
      const identityKey = this.keyManager?.keys['identity'];
      if (!identityKey) {
        return { results: [] };
      }

      const { cursorId, results } = await api.Search.getActiveChats({
        cursorId: oldCursorId,
        fromPublicKey: identityKey.pub,
        limit: this.limit
      });

      const messages = [];
      for (const encrypted of results) {
        //console.log(encrypted.contactInfo);

        const contactPublicKey =
          encrypted.fromPublicKey == identityKey.pub
            ? encrypted.toPublicKey
            : encrypted.fromPublicKey;

        const decrypted = await identityKey.endToEndDecryptText(
          contactPublicKey,
          encrypted.message,
          encrypted.nonce,
          encrypted.checksum
        );

        const self = encrypted.fromPublicKey == identityKey.pub;

        messages.push({
          contactInfo: encrypted.contactInfo,
          createdAt: new Date(encrypted.createdAt),
          nonce: encrypted.nonce,
          self,
          content: decrypted,
        });
      }

      return { cursorId, results: messages };
    },
  },
};
</script>