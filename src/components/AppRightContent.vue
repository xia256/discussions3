<template>
  <div>
    <v-card
      v-if="communityInfo"
      outlined
      rounded
    >
      <v-card-text>
        <CommunityInfo :value="communityInfo" />
      </v-card-text>
    </v-card>

    <v-card
      v-show="!communityInfo"
      class="mb-2"
      outlined
      rounded
    >
      <v-card-title class="pb-0">
        You might like
      </v-card-title>
      <v-card-text class="pa-0">
        <ReccomendUsers :limit="3" />
      </v-card-text>
    </v-card>

    <v-card
      v-show="!communityInfo"
      class="mb-2"
      outlined
      rounded
    >
      <v-card-title class="pb-0">
        What's trending
      </v-card-title>
      <v-card-text class="pa-0">
        <TagInfo
          v-for="(item, i) in trendingTags"
          :key="i"
          :tag-info="item"
        />
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import api from "../server/api";

import mixins from "../mixins";

import ReccomendUsers from "../components/ReccomendUsers";
import TagInfo from "../components/TagInfo";
import CommunityInfo from "../components/CommunityInfo";

export default {
  name: "AppRightContent",
  components: {
    ReccomendUsers,
    TagInfo,
    CommunityInfo
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    trendingTags: [],
    communityInfo: null,
  }),
  computed: {},
  watch: {
    "$route.params.communityName": async function () {
      await this.setCommunity();
    },
    async isLoggedIn() {
      await this.setCommunity();
    }
  },
  async created() {},
  async mounted() {
    this.setCommunity();

    const { results } = await api.Search.getTrendingTags({ limit: 3 });
    this.trendingTags = results;
  },
  async beforeDestroy() {},
  methods: {
    async setCommunity() {
      await this.waitForLoginFinish();

      const name = this.$route.params.communityName;
      if (!name) {
        this.communityInfo = null;
        return;
      }

      const communityInfo = await api.Search.getCommunityInfo({ name });
      this.communityInfo = communityInfo;
    },
  },
};
</script>