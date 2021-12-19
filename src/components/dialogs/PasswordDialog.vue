<template>
  <Dialog
    v-bind="$attrs"
    name="password"
    :min-height="0"
    @update="updateDialog"
  >
    <template v-slot:content>
      <template v-if="withdraw">
        <h1 class="mb-2">
          Withdraw
        </h1>
        <v-row>
          <v-col
            v-if="!isMobile"
            cols="auto"
          >
            <Avatar :src="account.avatar" />
            <span>{{ account.username }}</span>
          </v-col>
          <v-col cols="auto">
            <TokenIcon :symbol="'ATMOS'" />
            <span>{{ withdraw.amount }}</span>
          </v-col>
          <v-col
            v-if="!isMobile"
            cols="auto"
          >
            <v-icon>mdi-arrow-right</v-icon>
          </v-col>
          <v-col cols="auto">
            <span>{{ withdraw.account }}</span>
          </v-col>
        </v-row>
      </template>
      <template v-else-if="transfers">
        <h1 class="mb-2">
          Transfer
        </h1>
        <v-row
          v-for="(t, i) in transfers"
          :key="i"
        >
          <v-col
            v-if="!isMobile"
            cols="auto"
          >
            <Avatar :src="account.avatar" />
            <span>{{ account.username }}</span>
          </v-col>
          <v-col cols="auto">
            <TokenIcon :symbol="t.symbol" />
            <span class="ml-2">{{ t.amount }}</span>
          </v-col>
          <v-col
            v-if="!isMobile"
            cols="auto"
          >
            <v-icon>mdi-arrow-right</v-icon>
          </v-col>
          <v-col cols="auto">
            <Avatar :src="t.recipient.avatar" />
            <span>{{ t.recipient.username }}</span>
          </v-col>
        </v-row>
      </template>
      <v-row>
        <v-col cols="12">
          <v-form
            ref="form"
            lazy-validation
            @submit.prevent
          >
            <v-text-field
              v-model="password"
              :rules="passwordTesterRules"
              label="Password"
              type="password"
              required
              @keydown.enter="pressContinue()"
            />
          </v-form>
        </v-col>
        <v-col cols="12">
          <v-btn
            block
            outlined
            color="success"
            :disabled="!correctPassword"
            @click="pressContinue()"
          >
            Continue
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </Dialog>
</template>

<script>
import { KeyManager } from "../../KeyManager";
import api from "../../server/api";

import mixins from "../../mixins";

import Dialog from "../Dialog";
import TokenIcon from "../TokenIcon";
import Avatar from "../Avatar";

export default {
  name: "PasswordDialog",
  components: {
    Dialog,
    TokenIcon,
    Avatar,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    correctPassword: false,
    encryptedMnemonic: "",
    password: "",
    transfers: null,
    withdraw: null,
    continueCallback: null,
  }),
  computed: {
    passwordTesterRules() {
      return this.correctPassword ? [] : ["Invalid password"];
    },
  },
  watch: {
    async password() {
      this.correctPassword = false;
      if (this.encryptedMnemonic && this.password) {
        try {
          await KeyManager.decrypt(this.password, this.encryptedMnemonic);
          this.correctPassword = true;
        } catch (ex) {
          this.correctPassword = false;
        }
      }
    },
  },
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async pressContinue() {
      this.continueCallback?.({
        password: this.password,
        encryptedMnemonic: this.encryptedMnemonic,
      });
      this.continueCallback = null;

      this.closeDialog("password");
    },
    async updateDialog({ isDialogOpen, options }) {
      if (isDialogOpen) {
        if (!this.encryptedMnemonic) {
          this.encryptedMnemonic = await api.Account.getLoginChallenge({
            username: this.account.username,
          });
        }

        this.continueCallback = options.continueCallback;
        this.transfers = options.transfers ?? null;
        this.withdraw = options.withdraw ?? null;
      } else {
        this.correctPassword = false;
        this.encryptedMnemonic = "";
        this.password = "";
        this.continueCallback?.({});
        this.continueCallback = null;
        this.transfers = null;
        this.withdraw = null;
      }
    },
  },
};
</script>