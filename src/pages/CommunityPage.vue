<template>
  <v-row>
    <v-col :cols="12">
      <v-card flat>
        <v-card-text class="pt-0 pb-0">
          <v-tabs v-model="tabIndex">
            <v-tab>Create/Edit</v-tab>
            <v-tab>Manage</v-tab>
          </v-tabs>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col :cols="12">
      <CommunityEditor
        v-if="tabIndex == 0"
        v-model="community"
        :is-waiting="waiting"
        @submit="createCommunity"
      >
        <template v-slot:result>
          <ResultText
            class="text-center"
            :text="resultText"
          />
        </template>
      </CommunityEditor>
      <template v-else-if="tabIndex == 1">
        <SearchCursor :advance-cursor="getOwnedCommunities">
          <template v-slot:content="{ items }">
            <v-card
              v-for="(ci, i) in items"
              :key="i"
              flat
            >
              <v-card-text>
                <v-row no-gutters>
                  <v-col class="d-flex flex-shrink-1">
                    <CommunityInfo
                      no-action
                      :value="ci"
                    />
                  </v-col>
                  <v-col class="d-flex justify-end">
                    <v-btn
                      rounded
                      outlined
                      color="primary"
                      @click="editCommunity(ci)"
                    >
                      Edit
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </SearchCursor>
      </template>
    </v-col>
  </v-row>
</template>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import { getActionCommitment } from "../utility";

import { CommunityObject } from "../server/api/objects";

import ResultText from "../components/ResultText";
import SearchCursor from "../components/SearchCursor";
import CommunityInfo from "../components/CommunityInfo";
import CommunityEditor from "../components/CommunityEditor";

export default {
  name: "CommunityPage",
  components: {
    ResultText,
    SearchCursor,
    CommunityInfo,
    CommunityEditor,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0,
    resultText: "",
    community: null,
  }),
  computed: {},
  watch: {
    tabIndex() {
      this.resultText = "";
      if (this.tabIndex != 0) {
        this.community = null;
      }
    },
  },
  async created() {
  },
  async mounted() {
    await this.setMeta({ 
      title: `Community - ${ServerConfig.name}` 
    });
  },
  async beforeDestroy() {},
  methods: {
    async editCommunity(communityInfo) {
      const moderators = await Promise.all(
        communityInfo.moderators.map((identityPublicKey) =>
          api.Search.getUserInfo({ identityPublicKey })
        )
      );

      const community = {
        name: communityInfo.name,
        filter: communityInfo.filter,
        description: communityInfo.description,
        moderators,
      };

      this.tabIndex = 0;
      this.community = community;
    },
    async getOwnedCommunities({ cursorId }) {
      return await api.Search.getOwnedCommunities({
        cursorId,
      });
    },
    async createCommunity() {
      try {
        if (!this.community?.name) return;

        this.resultText = "";

        const community = this.community.name;
        const { source: filter } = CommunityObject.compileFilter(
          this.community.filter
        );
        const moderators = this.community.moderators.map(
          (m) => m.identityPublicKey
        );
        const description = this.community.description;

        const identityKey = this.keyManager.keys['identity'];

        const args = {
          identityPublicKey: identityKey.pub,
          community,
          filter,
          moderators,
          description,
          nonce: Date.now(),
        };

        await this.wait(async () => {
          const commitment = await getActionCommitment({
            name: "create-community",
            ...args,
          });
          const signature = await identityKey.signText(commitment);
          const result = await api.Action.createCommunity({
            signature,
            ...args,
          });
          this.resultText = `Community has been ${
            result == 1 ? "created" : "updated"
          }!`;
        });
      } catch (ex) {
        this.resultText = ex.toString();
      }
    },
  },
};
</script>