<template>
  <Popover
    name="mentionlist"
    @update="updateState"
  >
    <v-card
      v-if="hashtag"
      flat
      class="pa-0"
      @click="selectHashtag()"
    >
      <v-card-text class="pa-0">
        <span><v-icon :size="24">mdi-pound</v-icon> {{ hashtag }}</span>
      </v-card-text>
    </v-card>
    <v-card
      v-else-if="community"
      flat
      class="pa-0"
      @click="selectCommunity()"
    >
      <v-card-text class="pa-0">
        <span><v-icon :size="24">mdi-account-group</v-icon> {{ community }}</span>
      </v-card-text>
    </v-card>
    <v-card
      v-for="(profileAccount, i) in accounts"
      v-else
      :key="i"
      class="pa-0"
      flat
      @click="selectAccount(profileAccount)"
    >
      <v-card-text class="pa-0">
        <v-row no-gutters>
          <v-col cols="auto">
            <Avatar
              class="mb-1"
              :src="profileAccount.avatar"
            />
          </v-col>
          <v-col class="d-flex flex-shrink-1 overflow-hidden">
            <div class="ml-2 w-95">
              <span
                class="d-inline-block mr-2 font-weight-bold text-decoration-none"
              >
                @{{ profileAccount.username }}
              </span>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </Popover>
</template>

<script>
import mixins from "../../mixins";

import Popover from "../Popover";

import Avatar from "../Avatar";

export default {
  name: "MentionListPopover",
  components: {
    Popover,
    Avatar,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    accounts: [],
    hashtag: "",
    community: "",
    onSelectAccount: null,
    onSelectHashtag: null,
    onSelectCommunity: null,
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async updateState({ options }) {
      if (!options) {
        this.accounts = [];
        this.hashtag = "";
        this.community = "";
        this.onSelectAccount = null;
        this.onSelectHashtag = null;
        this.onSelectCommunity = null;
      } else {
        this.accounts = options.accounts ?? [];
        this.hashtag = options.hashtag ?? "";
        this.community = options.community ?? "";
        this.onSelectAccount = options.onSelectAccount ?? null;
        this.onSelectHashtag = options.onSelectHashtag ?? null;
        this.onSelectCommunity = options.onSelectCommunity ?? null;
      }
    },
    selectCommunity() {
      if (!this.onSelectCommunity || this.onSelectCommunity(this.community))
        this.closePopover("mentionlist");
    },
    selectHashtag() {
      if (!this.onSelectHashtag || this.onSelectHashtag(this.hashtag))
        this.closePopover("mentionlist");
    },
    selectAccount(a) {
      if (!this.onSelectAccount || this.onSelectAccount(a))
        this.closePopover("mentionlist");
    },
  },
};
</script>