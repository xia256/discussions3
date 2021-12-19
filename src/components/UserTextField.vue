<template>
  <v-text-field
    ref="textField"
    v-model="username"
    v-bind="$attrs"
    autocomplete="off"
    @keydown.enter="earlySelect"
  >
    <template v-slot:prepend>
      <slot name="prepend" />
      <Avatar
        v-if="prependAvatar"
        :size="30"
        :src="value ? value.avatar : ''"
      />
    </template>
    <template v-slot:append-outer>
      <slot name="append-outer" />
    </template>
  </v-text-field>
</template>

<script>
import { mapState } from "vuex";

import api from "../server/api";
import mixins from "../mixins";

import Avatar from "./Avatar";

export default {
  name: "UserTextField",
  components: {
    Avatar
  },
  mixins: [mixins.Common],
  props: {
    value: { type: Object, default: () => null },
    prependAvatar: { type: Boolean, default: false }
  },
  data: () => ({
    username: "",
  }),
  computed: {
    ...mapState(["popovers"]),
  },
  watch: {
    async username() {
      // allow optional prefix with @
      let username = this.username;
      if (!username) return;

      if (username.startsWith("@")) {
        username = username.substring(1);
      }

      if (username == this.value?.username) return;
      await this.promptMentionList(username);
    },
    value() {
      this.username = this.value ? `@${this.value.username}` : "";
    },
  },
  async created() {
      this.username = this.value ? `@${this.value.username}` : "";
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async promptMentionList(username = "") {
      const accounts = await api.Search.searchAccounts({ username });
      const rect = this.$refs.textField.$el.getBoundingClientRect();
      const x = rect.x;
      const y = rect.y + rect.height - 20;

      this.openPopover(
        "mentionlist",
        {},
        {
          debounce: 0,
          x,
          y,
          accounts,
          onSelectAccount: (a) => this.selectAccount(a),
        }
      );
    },
    selectAccount(a) {
      this.$emit("input", a);
      return true;
    },
    earlySelect() {
      const accounts = this.popovers["mentionlist"].accounts;
      if (accounts && accounts.length > 0) {
        this.selectAccount(accounts[0]);
      }
      this.closePopover("mentionlist");
    },
  },
};
</script>