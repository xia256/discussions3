<template>
  <Dialog
    v-bind="$attrs"
    name="login"
    :close-button="closeButton"
    @update="resetDialog"
  >
    <template v-slot:content>
      <v-tabs-items
        v-model="tabIndex"
        touchless
      >
        <v-tab-item
          :transition="false"
          :reverse-transition="false"
        >
          <h1 class="mb-2">
            Login
          </h1>
          <v-row>
            <v-col>
              <v-form @submit.prevent>
                <v-text-field
                  v-model="username"
                  label="Username"
                  :error-messages="usernameErrors"
                />
                <v-text-field
                  v-model="password"
                  label="Password"
                  type="password"
                  :error-messages="passwordErrors"
                  @keydown.enter="completeLogin"
                />
              </v-form>
              <p class="text-right">
                <v-btn
                  text
                  @click="tabIndex = 3"
                >
                  I forgot my password
                </v-btn>
              </p>
              <v-row>
                <v-col
                  :cols="6"
                  class="pl-0"
                >
                  <v-btn
                    rounded
                    color="primary"
                    outlined
                    block
                    @click="tabIndex = 1"
                  >
                    Register
                  </v-btn>
                </v-col>
                <v-col
                  :cols="6"
                  class="pr-0"
                >
                  <v-btn
                    :disabled="waiting"
                    rounded
                    color="primary"
                    block
                    @click="completeLogin"
                  >
                    <v-progress-circular
                      v-if="waiting"
                      class="mr-2"
                      indeterminate
                    />
                    Next
                  </v-btn>
                </v-col>
              </v-row>
              <div class="mt-2">
                <v-btn
                  outlined
                  rounded
                  block
                  class="mb-1"
                  @click="openOAuthPopup('discord')"
                >
                  <v-icon class="mr-2">
                    mdi-discord
                  </v-icon>
                  <span>Continue with Discord</span>
                </v-btn>
                <v-btn
                  outlined
                  rounded
                  block
                  class="mb-1"
                  @click="openOAuthPopup('reddit')"
                >
                  <v-icon class="mr-2">
                    mdi-reddit
                  </v-icon>
                  <span>Continue with Reddit</span>
                </v-btn>
                <v-btn
                  outlined
                  rounded
                  block
                  class="mb-1"
                  @click="openOAuthPopup('twitter')"
                >
                  <v-icon class="mr-2">
                    mdi-twitter
                  </v-icon>
                  <span>Continue with Twitter</span>
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-tab-item>
        <v-tab-item
          :transition="false"
          :reverse-transition="false"
        >
          <v-tabs-items
            v-model="registerTabIndex"
            touchless
          >
            <v-tab-item
              :transition="false"
              :reverse-transition="false"
            >
              <h1 class="mb-2">
                Register
              </h1>
              <v-form
                ref="registerForm"
                v-model="registerForm"
                @submit.prevent
              >
                <v-text-field
                  v-model="username"
                  autocomplete="off"
                  label="Username"
                  :rules="usernameRules"
                  :error-messages="usernameErrors"
                />
                <v-text-field
                  v-model="password"
                  autocomplete="off"
                  label="Password"
                  type="password"
                  :rules="passwordRules"
                />
                <v-text-field
                  v-model="confirmPassword"
                  autocomplete="off"
                  label="Confirm Password"
                  type="password"
                  :rules="confirmPasswordRules"
                  @keydown.enter="registerStep2"
                />
              </v-form>
              <v-row>
                <v-col :cols="6">
                  <v-btn
                    class="mt-2"
                    rounded
                    color="primary"
                    block
                    outlined
                    @click="tabIndex = 0"
                  >
                    Back
                  </v-btn>
                </v-col>
                <v-col :cols="6">
                  <v-btn
                    :disabled="waiting"
                    class="mt-2"
                    rounded
                    color="primary"
                    block
                    @click="registerStep2"
                  >
                    <v-progress-circular
                      v-if="waiting"
                      class="mr-2"
                      indeterminate
                    />
                    Next
                  </v-btn>
                </v-col>
              </v-row>
            </v-tab-item>
            <v-tab-item
              :transition="false"
              :reverse-transition="false"
            >
              <h1 class="mb-2">
                Save your Master Key
              </h1>
              <div class="mb-2">
                <p class="error--text font-weight-bold">
                  If you get locked out of your account, you can always use your
                  Master Key to login.
                </p>
                <p>
                  If you lose your Master Key we cannot access or recover it for
                  you! Please keep it somewhere safe!
                </p>
                <h3>Master Key</h3>
                <v-alert
                  color="warning lighten-3"
                  class="pa-1"
                  @click="copyMasterKey"
                >
                  <v-card
                    class="master-key"
                    color="warning lighten-5"
                    outlined
                  >
                    <v-card-text class="font-weight-bold black--text">
                      {{ mnemonic }}
                    </v-card-text>
                  </v-card>
                </v-alert>
              </div>
              <v-row>
                <v-col :cols="isMobile ? 12 : 6">
                  <v-btn
                    rounded
                    block
                    color="primary"
                    @click="downloadedMnemonic"
                  >
                    <span>Download Master Key</span>
                  </v-btn>
                </v-col>
                <v-col :cols="isMobile ? 12 : 6">
                  <v-btn
                    rounded
                    block
                    color="primary"
                    @click="copyMasterKey"
                  >
                    <span>Copy Master Key</span>
                  </v-btn>
                </v-col>
                <v-col :cols="12">
                  <div class="d-flex flex-column align-center">
                    <v-checkbox
                      v-model="savedMasterKey"
                      hide-details
                      label="I have saved my Master Key"
                    />
                  </div>
                </v-col>
                <v-col :cols="6">
                  <v-btn
                    rounded
                    block
                    color="primary"
                    outlined
                    @click="(registerTabIndex = 0), (closeButton = true)"
                  >
                    <span>Back</span>
                  </v-btn>
                </v-col>
                <v-col :cols="6">
                  <v-btn
                    :disabled="!savedMasterKey || waiting"
                    rounded
                    block
                    color="primary"
                    @click="completeRegistration"
                  >
                    <v-progress-circular
                      v-if="waiting"
                      class="mr-2"
                      indeterminate
                    />
                    <span>Finish</span>
                  </v-btn>
                </v-col>
              </v-row>
            </v-tab-item>
          </v-tabs-items>
        </v-tab-item>
        <v-tab-item
          :transition="false"
          :reverse-transition="false"
        >
          <h1 class="mb-2">
            OAuth Login
          </h1>
          <v-form @submit.prevent>
            <v-radio-group v-model="selectedIdentity">
              <v-radio
                v-for="(user, i) in identities"
                :key="user.identityPublicKey"
                :label="user.username"
                :value="i"
              />
            </v-radio-group>
            <v-text-field
              v-model="password"
              autocomplete="off"
              label="Password"
              type="password"
              :error-messages="passwordErrors"
              @keydown.enter="completeOAuthLogin"
            />
          </v-form>
          <v-row>
            <v-col :cols="6">
              <v-btn
                class="mt-2"
                rounded
                color="primary"
                block
                @click="tabIndex = 0"
              >
                Back
              </v-btn>
            </v-col>
            <v-col :cols="6">
              <v-btn
                :disabled="waiting"
                class="mt-2"
                rounded
                color="primary"
                block
                @click="completeOAuthLogin"
              >
                <v-progress-circular
                  v-if="waiting"
                  class="mr-2"
                  indeterminate
                />
                Next
              </v-btn>
            </v-col>
          </v-row>
        </v-tab-item>
        <v-tab-item
          :transition="false"
          :reverse-transition="false"
        >
          <h1 class="mb-2">
            Account Recovery
          </h1>
          <v-form @submit.prevent>
            <v-text-field
              v-model="mnemonic"
              autocomplete="off"
              label="Master Key"
              :error-messages="mnemonicErrors"
            />
            <v-text-field
              v-model="password"
              autocomplete="off"
              label="New Password"
              type="password"
              :rules="passwordRules"
            />
            <v-text-field
              v-model="confirmPassword"
              autocomplete="off"
              label="Confirm Password"
              type="password"
              :rules="confirmPasswordRules"
              @keydown.enter="completeRecoverAccount"
            />
          </v-form>
          <v-row>
            <v-col :cols="6">
              <v-btn
                class="mt-2"
                rounded
                color="primary"
                block
                @click="tabIndex = 0"
              >
                Back
              </v-btn>
            </v-col>
            <v-col :cols="6">
              <v-btn
                :disabled="waiting"
                class="mt-2"
                rounded
                color="primary"
                block
                @click="completeRecoverAccount"
              >
                <v-progress-circular
                  v-if="waiting"
                  class="mr-2"
                  indeterminate
                />
                Next
              </v-btn>
            </v-col>
          </v-row>
        </v-tab-item>
      </v-tabs-items>
    </template>
  </Dialog>
</template>

<style lang="scss" scoped>
.master-key {
  cursor: pointer;
}
</style>

<script>
import { KeyManager } from "../../KeyManager";

import api from "../../server/api";

import { getActionCommitment, validateUsername } from "../../utility";

import {
  usernameRules,
  passwordRules,
  confirmPasswordRules,
} from "../../utility/rules";

import mixins from "../../mixins";

import Dialog from "../Dialog";

export default {
  name: "LoginDialog",
  components: {
    Dialog,
  },
  mixins: [mixins.Common, mixins.Login],
  props: {},
  data: () => ({
    registerForm: false,
    oauth: null,
    selectedIdentity: 0,
    identities: [],
    closeButton: true,
    savedMasterKey: false,
    tabIndex: 0,
    registerTabIndex: 0,
    confirmPassword: "",
    password: "",
    passwordErrors: [],
    username: "",
    usernameErrors: [],
    mnemonic: "",
    mnemonicErrors: [],
  }),
  computed: {
    ...usernameRules("username"),
    ...passwordRules("password"),
    ...confirmPasswordRules("password", "confirmPassword"),
  },
  watch: {
    tabIndex() {
      this.usernameErrors = [];
      this.mnemonicErrors = [];
      this.passwordErrors = [];

      if (this.tabIndex == 0) {
        //this.username = "";
        this.password = "";
      } else if (this.tabIndex == 1) {
        //this.username = "";
        this.password = "";
        this.confirmPassword = "";
        this.mnemonic = KeyManager.generateMnemonic();
      } else if (this.tabIndex == 3) {
        this.mnemonic = "";
        this.password = "";
        this.confirmPassword = "";
      }
    },
    username() {
      this.usernameErrors = [];
    },
    mnemonic() {
      this.mnemonicErrors = [];
    },
    password() {
      this.passwordErrors = [];
    },
  },
  async created() {
    api.addEventListener("suggestLoginIdentities", this.suggestLoginIdentities);
    api.addEventListener("suggestRegister", this.suggestRegister);
  },
  async mounted() {},
  async beforeDestroy() {
    api.removeEventListener(
      "suggestLoginIdentities",
      this.suggestLoginIdentities
    );
    api.removeEventListener("suggestRegister", this.suggestRegister);
  },
  methods: {
    async completeLogin() {
      return this.wait(async () => {
        let encryptedMnemonic = undefined;
        let keyManager = undefined;

        try {
          encryptedMnemonic = await api.Account.getLoginChallenge({
            username: this.username,
          });
        } catch (ex) {
          this.usernameErrors = [ex.message];
          return;
        }

        try {
          keyManager = await KeyManager.decrypt(
            this.password,
            encryptedMnemonic
          );
        } catch (ex) {
          this.passwordErrors = ["Invalid password"];
          return console.log(ex);
        }

        await this.login(keyManager); // try login

        this.closeDialog("login");
      });
    },
    async completeRecoverAccount() {
      return this.wait(async () => {
        let keyManager = undefined;

        try {
          keyManager = await KeyManager.create(this.mnemonic);

          const encryptedMnemonic = keyManager.encrypt(this.password);
          const identityKey = keyManager.keys["identity"];
          const walletKey = keyManager.keys["wallet"];

          const publicKeys = `${identityKey.pub} ${walletKey.pub}`;
          const publicKeyProofs = {
            identity: await identityKey.signText(publicKeys),
            wallet: await walletKey.signText(publicKeys),
          };

          await api.Account.recoverAccount({
            nonce: Date.now(),
            encryptedMnemonic,
            publicKeys,
            publicKeyProofs,
          });
        } catch (ex) {
          this.mnemonicErrors = [ex.message];
          return;
        }

        await this.login(keyManager); // try login

        this.closeDialog("login");
      });
    },
    async registerStep2() {
      return this.wait(async () => {
        try {
          validateUsername(this.username);

          let idpks = [];
          try {
            idpks = await api.Action.getIdentities({
              usernames: [this.username],
            });
          } catch (ex2) {
            // so we actually want an exception to be thrown here,
            // as it indicates the username isn't actually taken
          }

          if (idpks && idpks.length > 0) {
            throw new Error(`Username is already in use!`);
          }
        } catch (ex) {
          this.usernameErrors = [ex.message];
        }

        this.$refs.registerForm.validate();
        if (!this.registerForm || this.usernameErrors.length > 0) return; // not ready

        // this is now set in the watch handler for [tabIndex]
        //this.mnemonic = KeyManager.generateMnemonic();

        this.registerTabIndex = 1;
        this.closeButton = false;
      });
    },
    async suggestLoginIdentities({ detail: { identities } }) {
      this.identities = identities;
      this.tabIndex = 2; // oauth tab index
    },
    async suggestRegister({ detail: { oauth, username } }) {
      this.oauth = { ...oauth };
      this.registerTabIndex = 0;
      this.tabIndex = 1; // register tab index
      this.username = username.replace(/[^a-zA-Z0-9_]/gi, "_"); // only keep alphanumeric and _
    },
    async resetDialog() {
      this.selectedIdentity = 0;
      this.identities = [];
      this.tabIndex = 0;
      this.registerTabIndex = 0;
      this.closeButton = true;
      this.savedMasterKey = false;
      this.revealMasterKey = false;
      this.username = "";
      this.password = "";
      this.confirmPassword = "";
      this.mnemonic = "";
    },
    copyMasterKey() {
      this.$copyText(this.mnemonic);
    },
    downloadedMnemonic() {
      const fileType = "text/plain;charset=utf-8";
      const blob = new Blob([this.mnemonic], { type: fileType });

      const a = document.createElement("a");
      a.download = `mnemonic-${this.username}.txt`;
      a.href = URL.createObjectURL(blob);
      a.dataset.downloadurl = [fileType, a.download, a.href].join(":");
      a.style.display = "none";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    },
    async completeOAuthLogin() {
      return this.wait(async () => {
        const { encryptedMnemonic } = this.identities[this.selectedIdentity];
        let keyManager = undefined;

        try {
          keyManager = await KeyManager.decrypt(
            this.password,
            encryptedMnemonic
          );
        } catch (ex) {
          this.passwordErrors = ["Invalid password"];
          return;
        }

        await this.login(keyManager); // try login

        this.closeDialog("login");
      });
    },
    async completeRegistration() {
      return this.wait(async () => {
        const keyManager = await KeyManager.create(this.mnemonic);

        const encryptedMnemonic = keyManager.encrypt(this.password);
        const identityKey = keyManager.keys["identity"];
        const walletKey = keyManager.keys["wallet"];

        const publicKeysText = `${identityKey.pub} ${walletKey.pub}`;
        const publicKeyProofs = {
          identity: await identityKey.signText(publicKeysText),
          wallet: await walletKey.signText(publicKeysText),
        };

        const nonce = Date.now();
        const username = this.username;
        const args = {
          nonce,
          username,
          identityPublicKey: identityKey.pub,
          walletPublicKey: walletKey.pub,
          publicKeyProofs,
        };

        const commitment = await getActionCommitment({
          name: "create-account",
          ...args,
        });
        const signature = await identityKey.signText(commitment);

        const oauth = this.oauth;
        if (oauth && oauth.id && oauth.provider) {
          // off-chain action
          const oauthCommitment = await getActionCommitment({
            name: "oauth-link",
            nonce,
            oauth,
          });
          const oauthSignature = await identityKey.signText(oauthCommitment);
          oauth.signature = oauthSignature;
        }

        try {
          await api.Action.createAccount({
            ...args,
            signature,
            oauth,
            encryptedMnemonic,
          });
        } catch (ex) {
          this.mnemonicErrors = [ex.message];
          return;
        }

        await this.login(keyManager); // try login

        this.closeDialog("login");
      });
    },
  },
};
</script>