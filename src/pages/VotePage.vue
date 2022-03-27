<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs v-model="tabIndex">
              <v-tab>Vote</v-tab>
              <v-tab>History</v-tab>
              <v-tab>Create</v-tab>
              <v-tab style="display: none"></v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="tabIndex == 2">
      <v-col :cols="12">
        <v-row no-gutters>
          <v-col :cols="12">
            <p class="text-center">
              You have a voting power of <strong>{{ votePower }} VP</strong> you
              can obtain more by staking ATMOS. To create a proposal, you must
              have a voting power of at least 1 which is the equivalent of 1000
              ATMOS staked for 1 year.
            </p>
          </v-col>
          <v-col :cols="12">
            <v-text-field
              v-model="title"
              outlined
              small
              dense
              single-line
              label="Title"
            />
          </v-col>
          <v-col :cols="12">
            <v-text-field
              v-model="url"
              outlined
              small
              dense
              single-line
              label="Proposal Url"
            />
          </v-col>
          <v-col :cols="12">
            <v-btn block outlined color="success" @click="createProposal">
              <v-progress-circular
                v-show="waiting"
                class="mr-2"
                indeterminate
              />
              <span>Submit</span>
            </v-btn>
          </v-col>
          <v-col :cols="12">
            <ResultText class="text-center" :text="resultText" />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row v-else-if="tabIndex == 0 && stakes">
      <v-col :cols="12">
        <SearchCursor ref="cursor" top :advance-cursor="getProposals">
          <template v-slot:content="{ items }">
            <div v-for="(prop, i) in items" :key="i" class="mb-2">
              <VoteProposal :proposal="prop" :stakes="stakes" />
            </div>
          </template>
        </SearchCursor>
      </v-col>
    </v-row>
    <v-row v-else-if="tabIndex == 1 && stakes">
      <v-col :cols="12">
        <SearchCursor ref="cursor" top :advance-cursor="getHistoryProposals">
          <template v-slot:content="{ items }">
            <div v-for="(prop, i) in items" :key="i" class="mb-2">
              <VoteProposal :proposal="prop" :stakes="stakes" />
            </div>
          </template>
        </SearchCursor>
      </v-col>
    </v-row>
    <v-row v-else-if="tabIndex == 3 && singleProposal && stakes">
      <v-col :cols="12">
        <VoteProposal :proposal="singleProposal" :stakes="stakes" />
      </v-col>
      <v-col :cols="12">
        <Thread
          ref="thread"
          v-model="posts"
          :no-replies="true"
          :encoded-id="encodedThreadId"
          :username="threadUsername"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import mixins from "../mixins";
import SearchCursor from "../components/SearchCursor";
import ResultText from "../components/ResultText.vue";
import { PostObject } from "../server/api/objects";
import api from "../server/api";
import { KeyManager } from "../KeyManager";
import VoteProposal from "../components/VoteProposal.vue";
import Thread from "../components/Thread.vue";

const ONE_VOTE_UNIT = 52559900;

export default {
  name: "VotePage",
  components: {
    SearchCursor,
    ResultText,
    VoteProposal,
    Thread
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0,
    url: "",
    title: "",
    resultText: "",
    stakes: null,
    // --
    singleProposal: null,
    posts: [],
    encodedThreadId: '',
    threadUsername: ''
  }),
  computed: {
    votePower() {
      let power = this.stakes[this.selfWalletPublicKey];
      if (isNaN(power)) {
        return 0;
      }
      power /= ONE_VOTE_UNIT;
      return power.toFixed(4);
    },
  },
  watch: {
    tabIndex() {
      if (this.$refs.cursor) this.$refs.cursor.resetCursor();
    },
    "$route.params.proposalId": async function () {
      await this.setSingleProposal();
    },
  },
  async created() {
    const eosApi = await this.getEosioApi("EOS");
    const stakeAccounts = await eosApi.rpc.get_table_rows({
      json: true,
      code: `atmosstakev2`,
      scope: "3,ATMOS",
      table: "accounts",
      limit: 100,
    });

    this.stakes = stakeAccounts.rows.reduce(
      (acc, cv) => (
        (acc[KeyManager.legacyToPublicKey(cv.public_key)] = parseInt(
          cv.total_weight
        )),
        acc
      ),
      {}
    );

    //console.log(this.selfWalletPublicKey);
    //console.log(this.stakes[this.selfWalletPublicKey] / ONE_VOTE_UNIT);
  },
  async mounted() {
    await this.setSingleProposal();
  },
  async beforeDestroy() {},
  methods: {
    async setSingleProposal() {
      const proposalId = this.$route.params.proposalId;
      if (!proposalId) {
        this.singleProposal = null;
        return;
      }

      const [username, expires] = proposalId.split("-");
      const proposal = await api.Search.getSingleProposal({
        username,
        expires,
      });

      if (!proposal) {
        this.singleProposal = null;
        return;
      }

      const post = new PostObject(await api.Search.getSinglePost({ id: proposal.postId }));

      //console.log(`set single proposal`, proposal);
      this.encodedThreadId = post.getEncodedId();
      this.threadUsername = post.username;
      this.singleProposal = proposal;
      this.tabIndex = 3; // special tab
    },
    async getProposals({ cursorId: oldCursorId }) {
      const { cursorId, results } = await api.Search.getProposals({
        cursorId: oldCursorId,
      });

      const mapped = results.map((n) => ({
        ...n,
      }));

      return {
        cursorId,
        results: mapped,
      };
    },
    async getHistoryProposals({ cursorId: oldCursorId }) {
      const { cursorId, results } = await api.Search.getProposals({
        cursorId: oldCursorId,
        history: true,
      });

      const mapped = results.map((n) => ({
        ...n,
      }));

      return {
        cursorId,
        results: mapped,
      };
    },
    async createProposal() {
      // http://localhost:8080/p/Mucan/3jlubsmqw18gc/winter-anime-2022-in-nutshell

      try {
        if (this.url.indexOf("/p/") == -1) throw new Error("Invalid post url");

        const fragments = this.url
          .substring(this.url.indexOf("/p/"))
          .split("/");

        const username = fragments[2];
        const { shortId, createdAt } = PostObject.decodeId(fragments[3]);
        const post = new PostObject(
          await api.Search.getSinglePost({
            username,
            shortId,
            createdAt: createdAt.getTime(),
          })
        );

        const identityPublicKey = this.selfIdentityPublicKey;
        await api.Action.submitProposal({
          identityPublicKey,
          postId: post.id,
          title: this.title,
        });

        this.resultText = "Your proposal has been created!";
      } catch (ex) {
        this.resultText = ex.toString();
      }
    },
  },
};
</script>