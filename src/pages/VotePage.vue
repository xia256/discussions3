<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs v-model="tabIndex">
              <v-tab>Vote</v-tab>
              <v-tab>Create</v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="tabIndex == 1">
      <v-col :cols="12">
        <v-row no-gutters>
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
    <v-row v-if="tabIndex == 0">
      <v-col :cols="12">
        <SearchCursor ref="cursor" top :advance-cursor="getProposals">
          <template v-slot:content="{ items }">
            <div v-for="(prop, i) in items" :key="i" class="mb-2">
              <v-card outlined>
                <v-card-title>{{ prop.title }}</v-card-title>
                <v-card-subtitle>
                  Expires on {{ prop.shortExpires }}
                </v-card-subtitle>
                <v-card-actions>
                  <v-btn
                    small
                    :color="
                      prop.support.includes(selfWalletPublicKey) ? 'grey' : ''
                    "
                    @click="setVote(prop, 'support')"
                    ><v-icon>mdi-thumb-up</v-icon>
                    <span>{{ prop.supportWeight }}%</span></v-btn
                  >
                  <v-btn
                    small
                    :color="
                      prop.abstain.includes(selfWalletPublicKey) ? 'grey' : ''
                    "
                    @click="setVote(prop, 'abstain')"
                    ><v-icon>mdi-emoticon-neutral</v-icon>
                    <span>{{ prop.abstainWeight }}%</span></v-btn
                  >
                  <v-btn
                    small
                    :color="
                      prop.against.includes(selfWalletPublicKey) ? 'grey' : ''
                    "
                    @click="setVote(prop, 'against')"
                    ><v-icon>mdi-thumb-down</v-icon>
                    <span>{{ prop.againstWeight }}%</span></v-btn
                  >
                  <v-btn small @click="openProposal(prop)"
                    ><v-icon>mdi-arrow-right</v-icon></v-btn
                  >
                </v-card-actions>
              </v-card>
            </div>
          </template>
        </SearchCursor>
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
import { shortDateString, waitFor } from "../utility";
import { KeyManager } from "../KeyManager";

export default {
  name: "VotePage",
  components: {
    SearchCursor,
    ResultText,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0,
    url: "https://discussions.app/p/Mucan/3jlubsmqw18gc/winter-anime-2022-in-nutshell",
    title: "Test proposal",
    resultText: "",
    stakes: null,
  }),
  computed: {},
  watch: {},
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
    console.log(this.stakes);
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    getPropPercents(prop) {
      const allKeys = Array.from(
        new Set([...prop.support, ...prop.abstain, ...prop.against])
      );

      const totalWeight = allKeys.reduce(
        (sum, key) => sum + (this.stakes[key] ?? 0),
        0
      );
      const supportWeight = Math.floor(
        (prop.support.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) /
          totalWeight) *
          100
      );
      const abstainWeight = Math.floor(
        (prop.abstain.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) /
          totalWeight) *
          100
      );
      const againstWeight = 100 - supportWeight - abstainWeight; //prop.against.reduce((sum, key) => sum + (this.stakes[key] ?? 0), 0) / totalWeight;

      return {
        totalWeight,
        supportWeight,
        abstainWeight,
        againstWeight,
      };
    },
    async getProposals({ cursorId: oldCursorId }) {
      const { cursorId, results } = await api.Search.getProposals({
        cursorId: oldCursorId,
      });

      await waitFor(0, async () => this.stakes);
      //console.log('Stakes OK');

      const mapped = results.map((n) => ({
        ...n,
        ...this.getPropPercents(n),
        shortExpires: shortDateString(new Date(n.expires)),
      }));

      //console.log(mapped);

      return {
        cursorId,
        results: mapped,
      };
    },
    async setVote(prop, type) {
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
        type
      });

      Object.assign(prop, this.getPropPercents(prop));
    },
    async openProposal(prop) {
      //console.log(this.selfIdentityPublicKey);
      //console.log(this.selfWalletPublicKey);

      const post = new PostObject(
        await api.Search.getSinglePost({ id: prop.postId })
      );
      this.openThread(post);
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