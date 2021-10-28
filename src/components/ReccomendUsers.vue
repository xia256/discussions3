<template>
  <div>
    <SearchCursor
      ref="cursor"
      :advance-cursor="getFollowReccomendations"
      :id-predicate="(a) => a.identityPublicKey"
    >
      <template v-slot:no-results>
        {{ showPopular ? '' : 'No results :(' }}
      </template>
      <template v-slot:content="{ items }">
        <v-card
          v-for="(a, i) in items"
          :key="i"
          flat
        >
          <v-card-text>
            <ProfileInfo
              :value="a"
              horizontal
            />
          </v-card-text>
        </v-card>
      </template>
    </SearchCursor>
    <SearchCursor
      v-if="showPopular"
      ref="cursor2"
      :advance-cursor="getPopularUsers"
      :id-predicate="(a) => a.identityPublicKey"
      :condition="(a) => !$refs.cursor.items.some(a2 => a2.identityPublicKey == a.identityPublicKey)"
    >
      <template v-slot:content="{ items }">
        <v-card
          v-for="(a, i) in items"
          :key="i"
          flat
        >
          <v-card-text>
            <ProfileInfo
              :value="a"
              horizontal
            />
          </v-card-text>
        </v-card>
      </template>
    </SearchCursor>
  </div>
</template>

<script>
import api from "../server/api";

import mixins from "../mixins";
import { waitFor } from "../utility";

import SearchCursor from "../components/SearchCursor";
import ProfileInfo from "../components/ProfileInfo";

export default {
  name: "ReccomendUsers",
  components: {
    SearchCursor,
    ProfileInfo,
  },
  mixins: [mixins.Common],
  props: {
    limit: { type: Number, default: 0 },
    showPopular: { type: Boolean, default: false },
  },
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
    async getFollowReccomendations({ cursorId }) {
      return await api.Search.getFollowReccomendations({
        cursorId: cursorId,
        limit: this.limit ? this.limit : undefined,
      });
    },
    async getPopularUsers({ cursorId }) {
      // wait for the getFollowReccomendations cursor to terminate
      await waitFor(0, async () => this.$refs.cursor?.status == 3);
      return await api.Search.getPopularUsers({
        cursorId: cursorId,
      });
    } 
  },
};
</script>