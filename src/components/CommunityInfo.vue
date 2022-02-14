<template>
  <v-row
    v-if="value"
    no-gutters
  >
    <v-col cols="auto">
      <Avatar
        class="mb-1"
        default-icon="mdi-account-group"
        :size="50"
        :src="value.logo"
      />
    </v-col>
    <v-col class="d-flex flex-shrink-1 overflow-hidden">
      <div class="ml-2 w-95">
        <router-link
          text
          small
          dense
          class="d-inline-block mr-2 font-weight-bold text-decoration-none"
          :to="{
            name: 'viewcommunity',
            params: { communityName: value.name },
          }"
        >
          *{{ value.name }}
        </router-link>        
        <div
          v-if="!noAction"
          class="float-right ml-4"
        >
          <v-btn
            rounded
            color="primary"
            :outlined="value.isSubscribed"
            @click="joinLeaveCommunity"
          >
            {{ value.isSubscribed ? "leave" : "join" }}
          </v-btn>
        </div>
        <SanitizedHtml
          class="d-block"
          :html="value.description || ''"
        />
      </div>
    </v-col>
  </v-row>
</template>

<script>
import api from "../server/api";

import mixins from "../mixins";
import { getActionCommitment } from "../utility";

import Avatar from "./Avatar";
import SanitizedHtml from "./SanitizedHtml";

export default {
  name: "CommunityInfo",
  components: {
    Avatar,
    SanitizedHtml,
  },
  mixins: [mixins.Common],
  props: {
    value: { type: Object, default: null },
    noAction: { type: Boolean, default: false }
  },
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async joinLeaveCommunity() {
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;

      const identityKey = this.keyManager.keys['identity'];

      await this.wait(async () => {
        const inverted = this.value.isSubscribed ? false : true;

        // be optimistic about this and set it before signing and api call
        this.value.isSubscribed = inverted;

        const args = {
          identityPublicKey: identityKey.pub,
          community: this.value.name,
          value: inverted,
          nonce: Date.now(),
        };

        const commitment = await getActionCommitment({ name: "jl-community", ...args });
        const signature = await identityKey.signText(commitment);
        return await api.Action.joinLeaveCommunity({ signature, ...args });
      });
    }
  },
};
</script>