<template>
  <div>
    <SearchCursor
      ref="cursor"
      :advance-cursor="getPopularCommunities"
    >
      <template v-slot:content="{ items }">
        <v-card
          v-for="(c, i) in items"
          :key="i"
          flat
        >
          <v-card-text>
            <CommunityInfo :value="c" />
          </v-card-text>
        </v-card>
      </template>
    </SearchCursor>
  </div>
</template>

<script>
import api from "../server/api";

import mixins from "../mixins";
//import { waitFor } from "../utility";

import SearchCursor from "../components/SearchCursor";
import CommunityInfo from "../components/CommunityInfo";

export default {
  name: "ReccomendUsers",
  components: {
    SearchCursor,
    CommunityInfo,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async resetCursor() {
      return await this.$refs.cursor.resetCursor();
    },
    async getPopularCommunities({ cursorId }) {
      return await api.Search.getPopularCommunities({
        cursorId: cursorId,
      });
    },
  },
};
</script>