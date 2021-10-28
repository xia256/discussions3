<template>
  <Dialog
    v-bind="$attrs"
    name="editprofile"
    @update="updateDialog"
  >
    <template v-slot:content>
      <v-form>
        <v-row>
          <v-col :cols="12">
            <v-textarea
              v-model="biography"
              label="Biography"
            />
          </v-col>
          <v-col :cols="12">
            <v-row no-gutters>
              <v-col :cols="12">
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
                  <span>{{
                    discord ? `@${discord.username}` : `Connnect Discord`
                  }}</span>
                </v-btn>
              </v-col>
              <v-col :cols="12">
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
                  <span>{{ reddit ? reddit.username : `Connect Reddit` }}</span>
                </v-btn>
              </v-col>
              <v-col :cols="12">
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
                  <span>{{
                    twitter ? twitter.username : `Connect Twitter`
                  }}</span>
                </v-btn>
              </v-col>
              <v-col :cols="12">
                <div
                  v-if="discord"
                  class="d-flex flex-grow-1 justify-center"
                >
                  <v-checkbox
                    v-model="hideDiscord"
                    hide-details
                    label="Hide Discord handle on profile"
                  />
                </div>
                <div
                  v-if="reddit"
                  class="d-flex flex-grow-1 justify-center"
                >
                  <v-checkbox
                    v-model="hideReddit"
                    hide-details
                    label="Hide Reddit handle on profile"
                  />
                </div>
                <div
                  v-if="twitter"
                  class="d-flex flex-grow-1 justify-center"
                >
                  <v-checkbox
                    v-model="hideTwitter"
                    hide-details
                    label="Hide Twitter handle on profile"
                  />
                </div>
              </v-col>
              <v-col :cols="12">
                <ResultText
                  :text="resultText"
                  class="mt-4 text-center"
                />
                <v-btn
                  class="mt-4"
                  rounded
                  block
                  color="primary"
                  @click="saveProfile"
                >
                  Save
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-form>
    </template>
  </Dialog>
</template>

<script>
import api from "../../server/api";

import { getActionCommitment } from "../../utility";

import mixins from "../../mixins";

import Dialog from "../Dialog";
import ResultText from "../ResultText";

export default {
  name: "EditProfileDialog",
  components: {
    Dialog,
    ResultText,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    discord: null,
    reddit: null,
    twitter: null,
    resultText: "",
    biography: "",
    hideReddit: false,
    hideDiscord: false,
    hideTwitter: false,
  }),
  computed: {},
  watch: {},
  async created() {
    api.addEventListener("connectOAuth", this.connectOAuth);
  },
  async mounted() {},
  async beforeDestroy() {
    api.removeEventListener("connectOAuth", this.connectOAuth);
  },
  methods: {
    async saveProfile() {
      this.resultText = "";

      try {
        const hideOAuths = [];
        if (this.hideDiscord) hideOAuths.push("discord");
        if (this.hideReddit) hideOAuths.push("reddit");
        if (this.hideTwitter) hideOAuths.push("twitter");

        await api.Action.updateProfile({
          identityPublicKey: this.selfIdentityPublicKey,
          biography: this.biography,
          hideOAuths: hideOAuths,
        });

        this.resultText = "Saved";
      } catch (ex) {
        this.resultText = ex.toString();
      }
    },
    async connectOAuth({ detail: oauth }) {
      if (!this.isLoggedIn) return;
      const nonce = Date.now();
      const commitment = await getActionCommitment({
        name: "oauth-link",
        nonce,
        oauth,
      });

      const identityKey = this.keyManager.keys['identity'];
      const signature = await identityKey.signText(commitment);

      await api.Action.oauthLink({
        identityPublicKey: identityKey.pub,
        nonce,
        oauth,
        signature,
      });

      //console.log(oauth);

      if (oauth.provider == "discord") this.discord = oauth;
      else if (oauth.provider == "reddit") this.reddit = oauth;
      else if (oauth.provider == "twitter") this.twitter = oauth;
    },
    async updateDialog({ isDialogOpen }) {
      if (isDialogOpen && this.isLoggedIn) {
        const account = await api.Search.getUserInfo();
        const hideOAuths = account?.hideOAuths ?? [];

        const discord = account.oauth?.find((o) => o.provider == "discord");
        const reddit = account.oauth?.find((o) => o.provider == "reddit");
        const twitter = account.oauth?.find((o) => o.provider == "twitter");

        this.discord = discord;
        this.reddit = reddit;
        this.twitter = twitter;

        this.biography = account.biography ?? "";
        this.resultText = "";

        this.hideDiscord = hideOAuths.some((p) => p == "discord");
        this.hideReddit = hideOAuths.some((p) => p == "reddit");
        this.hideTwitter = hideOAuths.some((p) => p == "twitter");
      } else {
        this.discord = null;
        this.reddit = null;
        this.twitter = null;
        this.hideDiscord = false;
        this.hideReddit = false;
        this.hideTwitter = false;
        this.resultText = "";
      }
    },
  },
};
</script>