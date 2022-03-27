<template>
  <v-card outlined>
    <v-card-title>{{ proposal.title }}</v-card-title>
    <v-card-subtitle>
      <v-chip small>
        <span v-if="!expired">{{ shortExpires }}</span>
        <span v-else>Expired</span>
      </v-chip>
      <v-chip small class="ml-2">{{ totalVotePower }} VP</v-chip>
    </v-card-subtitle>
    <v-card-actions>
      <v-btn
        small
        :disabled="expired"
        :color="proposal.support.includes(selfWalletPublicKey) ? 'grey' : ''"
        @click="setVote('support')"
        ><v-icon>mdi-thumb-up</v-icon> <span>{{ supportWeight }}%</span></v-btn
      >
      <v-btn
        small
        :disabled="expired"
        :color="proposal.abstain.includes(selfWalletPublicKey) ? 'grey' : ''"
        @click="setVote('abstain')"
        ><v-icon>mdi-emoticon-neutral</v-icon>
        <span>{{ abstainWeight }}%</span></v-btn
      >
      <v-btn
        small
        :disabled="expired"
        :color="proposal.against.includes(selfWalletPublicKey) ? 'grey' : ''"
        @click="setVote('against')"
        ><v-icon>mdi-thumb-down</v-icon>
        <span>{{ againstWeight }}%</span></v-btn
      >
      <v-btn small @click="copyProposal()">
        <v-icon>mdi-content-copy</v-icon>
      </v-btn>
      <v-btn small @click="openProposal()"
        ><v-icon>mdi-arrow-right</v-icon></v-btn
      >
    </v-card-actions>
  </v-card>
</template>

<script>
const ONE_VOTE_UNIT = 52559900;

import mixins from "../mixins";
import { PostObject } from "../server/api/objects";
import api from "../server/api";
import { shortDateString } from "../utility";

export default {
  name: "VoteProposal",
  components: {},
  mixins: [mixins.Common],
  props: {
    proposal: { type: Object, require: true },
    stakes: { type: Object, require: true },
  },
  data: () => ({
    totalWeight: 0,
    totalVotePower: 0,
    supportWeight: 0,
    abstainWeight: 0,
    againstWeight: 0,
    expired: false,
    shortExpires: ''
  }),
  computed: {},
  watch: {
    proposal() {
      this.setPropPercents();
    },
  },
  async created() {
    //Object.assign(this.proposal, this.getPropPercents());
    //console.log(this.proposal);
  },
  async mounted() {
    this.setPropPercents();
  },
  async beforeDestroy() {},
  methods: {
    copyProposal() {
        const proposalId = `${this.proposal.username}-${this.proposal.expires}`;
        const url = `${window.location.protocol}//${window.location.host}/vote/${proposalId}`;
        console.log(url);

        this.$copyText(url);
    },
    async openProposal() {
      const prop = this.proposal;

      const post = new PostObject(
        await api.Search.getSinglePost({ id: prop.postId })
      );
      this.openThread(post);
    },
    setPropPercents() {
      //console.log(this.stakes);

      const prop = this.proposal;

      const allKeys = Array.from(
        new Set([...prop.support, ...prop.abstain, ...prop.against])
      );

      const totalWeight = allKeys.reduce(
        (sum, key) => sum + (this.stakes[key] ?? 0),
        0
      );
      const supportWeight = Math.round(
        (prop.support.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) /
          totalWeight) *
          100
      );
      const abstainWeight = Math.round(
        (prop.abstain.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) /
          totalWeight) *
          100
      );
      const againstWeight = 100 - supportWeight - abstainWeight; //prop.against.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) / totalWeight;

      this.expired = Date.now() >= prop.expires;
      this.shortExpires = shortDateString(new Date(prop.expires));
      this.totalWeight = totalWeight;
      this.totalVotePower = (totalWeight / ONE_VOTE_UNIT).toFixed(0);
      this.supportWeight = supportWeight;
      this.abstainWeight = abstainWeight;
      this.againstWeight = againstWeight;
    },
    async setVote(type) {
      const prop = this.proposal;
      if (prop.expired) return;

      const removeVote = (array) => {
        const set = new Set(array);
        set.delete(this.selfWalletPublicKey);
        return Array.from(set);
      };

      prop.support = removeVote(prop.support);
      prop.abstain = removeVote(prop.abstain);
      prop.against = removeVote(prop.against);

      prop[type].push(this.selfWalletPublicKey);

      // commit to server
      await api.Action.voteProposal({
        identityPublicKey: this.selfIdentityPublicKey,
        postId: prop.postId,
        expires: prop.expires,
        type,
      });

      this.setPropPercents();
      this.$forceUpdate();
    },
  },
};
</script>