<template>
  <v-row>
    <v-col :cols="12">
      <v-card flat>
        <v-card-text class="pt-0 pb-0">
          <v-tabs v-model="tabIndex">
            <v-tab>Posts</v-tab>
            <v-tab>Users</v-tab>
          </v-tabs>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col :cols="12">
      <PostScroller
        v-if="tabIndex == 0"
        ref="scroller"
        no-submitter
        :advance-cursor="getIgnoredPosts"
        :force-override-block="true"
      />
      <SearchCursor
        v-else-if="tabIndex == 1"
        ref="search"
        :advance-cursor="getBlocked"
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
    </v-col>
  </v-row>
</template>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import PostScroller from "../components/PostScroller";
import ProfileInfo from "../components/ProfileInfo";
import SearchCursor from "../components/SearchCursor";

export default {
  name: "ModerationPage",
  components: {
    PostScroller,
    ProfileInfo,
    SearchCursor,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0,
  }),
  computed: {},
  watch: {
    async tabIndex() {
      await this.$refs.search?.resetCursor();
      await this.$refs.scroller?.resetCursor();
    },
  },
  async created() {},
  async mounted() {
    await this.setMeta({
      title: `Moderation - ${ServerConfig.name}`,
    });
  },
  async beforeDestroy() {},
  methods: {
    async getIgnoredPosts({ cursorId }) {
      return await api.Search.getIgnoredPosts({
        cursorId,
      });
    },
    async getBlocked({ cursorId }) {
      return await api.Search.getBlocked({
        cursorId: cursorId,
      });
    },
  },
};
</script>