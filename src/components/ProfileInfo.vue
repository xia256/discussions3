<template>
  <v-row
    v-if="profileAccount && profileAccount.username"
    no-gutters
  >
    <v-col cols="auto">
      <Avatar
        class="mb-1"
        :size="avatarSize"
        :src="profileAccount.avatar"
      />
    </v-col>
    <v-col
      v-if="horizontal"
      class="d-flex flex-shrink-1 overflow-hidden"
    >
      <div class="ml-2 w-95">
        <router-link
          text
          small
          dense
          class="d-inline-block mr-2 font-weight-bold text-decoration-none"
          :to="{
            name: 'profile',
            params: { username: profileAccount.username },
          }"
        >
          @{{ profileAccount.username }}
        </router-link>
        <span
          v-for="(s, i) in social"
          :key="i"
          class="d-block overflow-hidden"
          style="white-space: nowrap; text-overflow: ellipsis;"
        >
          <v-icon class="tertiary--text">{{ `mdi-${s.provider}` }}</v-icon>
          {{ s.username }}
        </span>
      </div>
    </v-col>
    <v-col class="d-flex justify-end">
      <v-menu
        v-if="moreButton"
        offset-y
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            color="primary"
            outlined
            class="mr-2"
            icon
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>mdi-dots-horizontal</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <v-btn
              text
              @click="blockAccount"
            >
              <v-icon class="mr-2">
                mdi-block-helper
              </v-icon>
              <span>{{ profileAccount.isBlocked ? "Unblock" : "Block" }}</span>
            </v-btn>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn rounded icon outlined color="primary" class="mr-2" :to="{ name: 'messenger', params: { contactName: profileAccount.username } }">
        <v-icon>mdi-message</v-icon>
      </v-btn>
      <v-btn
        v-if="followButton && profileAccount && profileAccount.isBlocked"
        color="error"
        rounded
        @click="blockAccount"
      >
        Unblock
      </v-btn>
      <v-btn
        v-else-if="followButton"
        v-show="
          !isLoggedIn ||
            profileAccount.identityPublicKey != selfIdentityPublicKey
        "
        color="primary"
        :outlined="!profileAccount.isFollowing"
        rounded
        @click="followAccount"
      >
        {{ profileAccount.isFollowing ? "Unfollow" : "Follow" }}
      </v-btn>
      <v-btn
        v-show="
          !horizontal &&
            isLoggedIn &&
            profileAccount.identityPublicKey == selfIdentityPublicKey
        "
        color="primary"
        outlined
        rounded
        @click="openDialog('editprofile')"
      >
        Edit profile
      </v-btn>
    </v-col>
    <v-col
      v-if="!horizontal"
      :cols="12"
    >
      <router-link
        text
        small
        dense
        class="d-inline-block mr-2 font-weight-bold text-decoration-none"
        :to="{ name: 'profile', params: { username: profileAccount.username } }"
      >
        @{{ profileAccount.username }}
      </router-link>
      <span class="d-block tertiary--text">
        <v-icon class="tertiary--text"> mdi-calendar </v-icon>
        <span>Joined {{ joinDate }}</span>
      </span>
      <span
        v-for="(s, i) in social"
        :key="i"
        class="d-block"
      >
        <v-icon class="tertiary--text">{{ `mdi-${s.provider}` }}</v-icon>
        {{ s.username }}
      </span>
      <span
        v-if="!settings.neutralEngagement"
        class="mt-1 d-block"
      >
        <span
          class="mr-2"
        >{{ profileAccount.following }}
          <span class="tertiary--text">Following</span></span>
        <span
          class="mr-2"
        >{{ profileAccount.followers }}
          <span class="tertiary--text">Followers</span></span>
      </span>
    </v-col>
    <v-col :cols="12">
      <SanitizedHtml
        :style="horizontal ? `margin-left: 58px` : ``"
        :html="biography"
      />
    </v-col>
  </v-row>
</template>

<script>
import api from "../server/api";
import { LINK_REGEX } from "../server/api/oembed";
import { getActionCommitment } from "../utility";

import mixins from "../mixins";

import Avatar from "./Avatar";
import SanitizedHtml from "./SanitizedHtml";

export default {
  name: "ProfileInfo",
  components: {
    Avatar,
    SanitizedHtml,
  },
  mixins: [mixins.Common],
  props: {
    username: { type: String, default: "" },
    value: { type: Object, default: null },
    avatarSize: { type: Number, default: 50 },
    horizontal: { type: Boolean, default: false },
    moreButton: { type: Boolean, default: false },
    followButton: { type: Boolean, default: true },
  },
  data: () => ({
    profileAccount: null,
    social: [],
  }),
  computed: {
    biography() {
      const biography = this.profileAccount?.biography;
      if (!biography) return "";

      const biographyHtml = biography.replace(new RegExp(LINK_REGEX), (s) => {
        const s2 = s.replace(/https?:\/\//, "");
        return `<a href="https://${s2}" target="_blank">${s2}</a>`;
      });

      const result = `<span>${biographyHtml}</span>`;
      //console.log(result);

      return result;
    },
    joinDate() {
      if (!this.profileAccount) return "";
      const [, month, , year] = new Date(this.profileAccount.createdAt)
        .toDateString()
        .split(" ");
      return `${month} ${year}`;
    },
  },
  watch: {
    profileAccount() {
      //console.log(this.profileAccount);
      this.$emit("input", this.profileAccount);
    },
    async account() {
      await this.setProfileAccount();
    },
    async username() {
      await this.setProfileAccount();
    },
    async isLoggedIn() {
      return this.setProfileAccount();
    },
  },
  async created() {},
  async mounted() {
    await this.setProfileAccount();
  },
  async beforeDestroy() {},
  methods: {
    async setProfileAccount() {
      const username = this.username;
      const social = [];

      if (!username) {
        this.profileAccount = this.value;
      } else {
        this.profileAccount = await api.Search.getUserInfo({ username });
      }

      if (this.profileAccount) {
        //
        // normally hideOAuths is already applied to oauth, but it is not in the case of ourself
        // so, we strip it since this ProfileInfo where as in something like EditProfileInfo we need that info
        //
        const hideOAuths = this.profileAccount.hideOAuths ?? [];
        const oauth = (this.profileAccount.oauth ?? []).filter(
          ({ provider }) => !hideOAuths.some((p) => p == provider)
        );

        const discord = oauth.find((o) => o.provider == "discord");
        const reddit = oauth.find((o) => o.provider == "reddit");
        const twitter = oauth.find((o) => o.provider == "twitter");

        if (discord) social.push({ ...discord, icon: "mdi-discord" });
        if (reddit) social.push({ ...reddit, icon: "mdi-reddit" });
        if (twitter) social.push({ ...twitter, icon: "mdi-twitter" });
      }

      this.social = social;

      //console.log(this.profileAccount);
    },
    async blockAccount() {
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

        const args = {
          identityPublicKey: identityKey.pub,
          blockPublicKey,
          value: inverted,
          nonce: Date.now(),
        };

        const commitment = await getActionCommitment({
          name: "block",
          ...args,
        });
        const signature = await identityKey.signText(commitment);

        await api.Action.blockUser({
          signature,
          ...args,
        });
      });
    },
    async followAccount() {
      if (this.requireLoginDialog()) return;
      if (this.waiting) return;

      const followPublicKey = this.profileAccount?.identityPublicKey;

      if (!followPublicKey) return;

      const identityKey = this.keyManager.keys['identity'];
      if (this.profileAccount.identityPublicKey == identityKey.pub) return;

      await this.wait(async () => {
        const inverted = this.profileAccount.isFollowing ? false : true;

        // be optimistic about this and set it before signing and api call
        this.profileAccount.isFollowing = inverted;
        this.profileAccount.followers += inverted ? 1 : -1;

        const args = {
          identityPublicKey: identityKey.pub,
          followPublicKey,
          value: inverted,
          nonce: Date.now(),
        };

        const commitment = await getActionCommitment({
          name: "follow",
          ...args,
        });
        const signature = await identityKey.signText(commitment);

        await api.Action.followUser({
          signature,
          ...args,
        });
      });
    },
  },
};
</script>