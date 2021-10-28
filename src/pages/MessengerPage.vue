<template>
  <v-row>
    <v-col
      v-show="!isMobile || (contactInfo == null && !showConversation)"
      :cols="isMobile ? 12 : `auto`"
      :class="{ 'w-300px': !isMobile }"
    >
      <v-row>
        <v-col :cols="12">
          <div class="d-flex">
            <div class="justify-start">
              <h1 class="d-inline">
                Chats
              </h1>
            </div>
            <div class="d-flex flex-grow-1 align-center justify-end">
              <v-btn
                outlined
                icon
                color="white"
                @click="startConversation"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
      <ActiveMessengerChats
        ref="cursor2"
        @click-message="
          (msg) =>
            $router.push({
              name: 'messenger',
              params: { contactName: msg.contactInfo.username },
            })
        "
      />
    </v-col>
    <v-col
      v-show="!isMobile || contactInfo != null || showConversation"
      :cols="isMobile ? 12 : ``"
      :class="isMobile ? `` : `d-flex flex-grow-1`"
    >
      <v-row>
        <v-col :cols="12">
          <UserTextField
            ref="contact"
            v-model="contactInfo"
            label="Contact"
            prepend-avatar
          >
            <template v-slot:prepend>
              <v-btn
                v-show="isMobile"
                btn
                icon
                @click="(contactInfo = null), (showConversation = false)"
              >
                <v-icon>mdi-arrow-left</v-icon>
              </v-btn>
            </template>
          </UserTextField>
        </v-col>
        <v-col
          ref="messageContainer"
          class="message-container"
          :style="`max-height: ${messageContainerHeight}; min-height: ${messageContainerHeight};`"
        >
          <SearchCursor
            ref="cursor"
            top
            :advance-cursor="getDirectMessages"
          >
            <template v-slot:content="{ items }">
              <div
                v-for="(msg, i) in items"
                :key="i"
                class="mb-2"
              >
                <template
                  v-if="
                    i == 0 ||
                      msg.createdAt.getDate() != items[i - 1].createdAt.getDate()
                  "
                >
                  <div class="d-flex justify-center">
                    <v-chip class="mb-2">
                      {{ msg.createdAt.toLocaleDateString() }}
                    </v-chip>
                  </div>
                </template>
                <v-card
                  v-if="!msg.self"
                  class="w-300px"
                  color="#8d949e"
                  rounded
                >
                  <v-card-text class="black--text overflow-x-hidden">
                    <span>{{ msg.content }}</span>
                  </v-card-text>
                </v-card>
                <div
                  v-else
                  class="d-flex justify-end"
                >
                  <v-card
                    class="w-300px"
                    color="primary"
                    rounded
                  >
                    <v-card-text class="overflow-x-hidden">
                      <span>{{ msg.content }}</span>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </template>
          </SearchCursor>
        </v-col>
        <v-col :cols="12">
          <div class="mt-2">
            <v-text-field
              v-model="message"
              autocomplete="off"
              label="Message"
              :error-messages="errorMessages"
              @keydown.enter="send()"
            >
              <template v-slot:append-outer>
                <v-btn
                  :disabled="waiting"
                  small
                  color="primary"
                  @click="send()"
                >
                  Send
                </v-btn>
              </template>
            </v-text-field>
          </div>
        </v-col>
      </v-row>
    </v-col>
  </v-row>
</template>

<style lang="scss">
.message-container {
  overflow-y: scroll;
}

.chat__message--preview {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 11px;
}
</style>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import { delay } from "../utility";

import SearchCursor from "../components/SearchCursor";
import UserTextField from "../components/UserTextField";

import ActiveMessengerChats from "../components/ActiveMessengerChats";

export default {
  name: "MessengerPage",
  components: {
    SearchCursor,
    UserTextField,
    ActiveMessengerChats,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    contactInfo: null,
    showConversation: false,
    message: "",
    errorMessages: [],
  }),
  computed: {
    messageContainerHeight() {
      return `${window.innerHeight - 290}px`;
    },
  },
  watch: {
    "$route.params.contactName": async function () {
      const contactName = this.$route.params.contactName;
      this.startConversationWith(contactName);
    },
    contactInfo() {
      if (this.contactInfo) {
        this.showConversation = true;
        this.$refs.cursor?.resetCursor();
      }
    },
  },
  async created() {
    api.addEventListener("directMessage", this.receiveDirectMessage);
  },
  async mounted() {
    await this.setMeta({
      title: `Messenger - ${ServerConfig.name}`,
    });
    const contactName = this.$route.params.contactName;
    this.startConversationWith(contactName);
  },
  async beforeDestroy() {
    api.removeEventListener("directMessage", this.receiveDirectMessage);
  },
  methods: {
    async startConversationWith(contactName) {
      let contactInfo = null;

      if (contactName) {
        contactInfo = await api.Search.getUserInfo({
          username: contactName,
        });
      }

      this.contactInfo = contactInfo;
      if (!contactInfo) {
        await this.setMeta({ title: `Messenger - ${ServerConfig.name}` });
      } else {
        await this.setMeta({ title: `@${contactInfo.username} - Messenger` });
      }
    },
    startConversation() {
      const oldContactInfo = this.contactInfo;

      this.contactInfo = null;
      this.showConversation = true;

      if (!oldContactInfo) {
        this.$refs.contact.promptMentionList();
      }
    },
    async getDirectMessages({ cursorId: oldCursorId }) {
      const identityKey = this.keyManager?.keys['identity'];
      const contactPublicKey = this.contactInfo?.identityPublicKey;

      //console.log(`getDirectMessages`, contactPublicKey);

      if (!identityKey || !contactPublicKey) {
        return { results: [] };
      }

      const { cursorId, results } = await api.Search.getDirectMessages({
        cursorId: oldCursorId,
        fromPublicKey: identityKey.pub,
        toPublicKey: contactPublicKey,
      });

      const messages = [];
      for (const encrypted of results) {
        const decrypted = await identityKey.endToEndDecryptText(
          contactPublicKey,
          encrypted.message,
          encrypted.nonce,
          encrypted.checksum
        );

        const self = encrypted.fromPublicKey == identityKey.pub;

        messages.push({
          createdAt: new Date(encrypted.createdAt),
          nonce: encrypted.nonce,
          self,
          content: decrypted,
          contactPublicKey,
        });
      }

      return { cursorId, results: messages };
    },
    async receiveDirectMessage({
      detail: {
        createdAt,
        nonce,
        message,
        checksum,
        toPublicKey,
        fromPublicKey,
      },
    }) {
      const identityKey = this.keyManager?.keys['identity'];
      if (!identityKey) return;

      if (identityKey.pub != toPublicKey && identityKey.pub != fromPublicKey)
        return; // this should never happen...

      const contactPublicKey =
        identityKey.pub == toPublicKey ? fromPublicKey : toPublicKey;
      const self = fromPublicKey == identityKey.pub;

      const decrypted = await identityKey.endToEndDecryptText(
        contactPublicKey,
        message,
        nonce,
        checksum
      );

      await this.insertMessage({
        createdAt: new Date(createdAt),
        nonce,
        content: decrypted,
        self,
        contactPublicKey,
      });
    },
    scrollMessageContainer() {
      this.$nextTick(async () => {
        await delay(1);
        const $el = this.$refs.messageContainer;
        $el.scrollTop = $el.scrollHeight;
      });
    },
    async insertMessage({ createdAt, nonce, content, self, contactPublicKey }) {
      if (this.contactInfo?.identityPublicKey == contactPublicKey) {
        const items = this.$refs.cursor.items;

        for (let i = Math.max(0, items.length - 5); i < items.length; i++) {
          if (
            items[i].contactPublicKey == contactPublicKey &&
            items[i].nonce == nonce &&
            items[i].self == self
          ) {
            //console.log('we already have this message');
            return;
          }
        }

        items.push({
          createdAt: new Date(createdAt),
          nonce: nonce,
          content: content,
          self: self,
          contactPublicKey,
        });
      }

      const items = this.$refs.cursor2.items;
      let newActiveConversation = true;
      for (const msg of items) {
        if (msg.contactInfo?.identityPublicKey == contactPublicKey) {
          msg.createdAt = createdAt;
          msg.nonce = nonce;
          msg.content = content;
          msg.self = self;

          items.sort(
            (m1, m2) => m2.createdAt.getTime() - m1.createdAt.getTime()
          );

          newActiveConversation = false;
          break;
        }
      }

      if (newActiveConversation) {
        const contactInfo = await api.Search.getUserInfo({
          identityPublicKey: contactPublicKey,
        });
        items.unshift({
          createdAt,
          nonce,
          content,
          self,
          contactInfo,
        });
        //console.log(`created new active conversation`);
      }

      this.scrollMessageContainer();
    },
    async send() {
      const message = this.message;
      const contactInfo = this.contactInfo;

      if (!message) return;
      if (!contactInfo?.identityPublicKey) return;

      this.wait(async () => {
        this.message = "";
        this.errorMessages = [];

        const identityKey = this.keyManager.keys['identity'];

        const encrypted = await identityKey.endToEndEncryptText(
          contactInfo.identityPublicKey,
          message
        );

        // optimistic insert
        /*await this.insertMessage({
          createdAt: new Date(),
          nonce: encrypted.nonce,
          content: message,
          self: true,
          contactPublicKey: contactInfo.identityPublicKey,
        });*/

        try {
          await api.Action.sendDirectMessage(encrypted);
        } catch (ex) {
          this.message = message; // restore old message
          this.errorMessages = [ex.toString()];
        }
      });
    },
  },
};
</script>