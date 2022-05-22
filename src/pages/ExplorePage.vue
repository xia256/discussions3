<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs v-model="tabIndex">
              <v-tab
                v-for="(tab, i) in tabs"
                :key="i"
                style="min-width: 0px;"
              >
                <span v-if="!isMobile"> {{ tab }}</span>
                <v-icon v-else>
                  {{ tabIcons[tab] }}
                </v-icon>
              </v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        :cols="12"
        :class="{ 'pa-0': isMobile && !isMDPI }"
      >
        <v-tabs-items
          v-model="tabIndex"
          touchless
        >
          <v-tab-item
            v-if="tabExists('feed')"
            :transition="false"
            :reverse-transition="false"
          >
            <PostScroller
              v-if="tabName == 'feed'"
              ref="cursor"
              :advance-cursor="getFeedPosts"
            />
          </v-tab-item>
          <v-tab-item
            v-if="tabExists('popular')"
            :transition="false"
            :reverse-transition="false"
          >
            <PostScroller
              v-if="tabName == 'popular'"
              ref="cursor"
              no-submitter
              :advance-cursor="getExplorePosts"
            />
          </v-tab-item>
          <v-tab-item
            v-if="tabExists('trending')"
            :transition="false"
            :reverse-transition="false"
          >
            <SearchCursor
              v-if="tabName == 'trending'"
              ref="cursor"
              :advance-cursor="advanceTrendingTags"
            >
              <template v-slot:content="{ items }">
                <TagInfo
                  v-for="(item, i) in items"
                  :key="i"
                  :tag-info="item"
                />
              </template>
            </SearchCursor>
          </v-tab-item>
          <v-tab-item
            v-if="tabExists('users')"
            :transition="false"
            :reverse-transition="false"
          >
            <ReccomendUsers
              v-if="tabName == 'users'"
              ref="cursor"
              show-popular
              :limit="100"
            />
          </v-tab-item>
          <v-tab-item
            v-if="tabExists('community')"
            :transition="false"
            :reverse-transition="false"
          >
            <ReccomendCommunities
              v-if="tabName == 'community'"
              ref="cursor"
            />
          </v-tab-item>

          <!--FAQ Page-->
          <v-tab-item
            v-if="tabExists('faq')"
            :transition="false"
            :reverse-transition="false"
          >
            <FAQ
              v-if="tabName == 'faq'"
              ref="cursor"
            />
          </v-tab-item>

        </v-tabs-items>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import SearchCursor from "../components/SearchCursor";
import PostScroller from "../components/PostScroller";

import TagInfo from "../components/TagInfo";
import ReccomendUsers from "../components/ReccomendUsers";
import ReccomendCommunities from "../components/ReccomendCommunities";
import FAQ from "../components/FAQ.vue";

export default {
  name: "ExplorePage",
  components: {
    SearchCursor,
    PostScroller,
    TagInfo,
    ReccomendUsers,
    ReccomendCommunities,
    FAQ,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0,
    tabIcons: {
      feed: "mdi-rss",
      popular: "mdi-fire",
      trending: "mdi-pound",
      users: "mdi-account-multiple-plus",
      community: "mdi-account-group",
      faq: "mdi-account-group"
    },
  }),
  computed: {
    tabName() {
      return this.tabs[this.tabIndex];
    },
    tabs() {
      if (this.isLoggedIn)
        return ["feed", "popular", "trending", "users", "community", "faq"];
      else return ["popular", "trending", "community", "faq"];
    },
  },
  watch: {
    async tabIndex() {
      // ...
    },
  },
  async created() {},
  async mounted() {
    await this.setMeta({
      title: `Explore - ${ServerConfig.name}`,
    });
  },
  methods: {
    tabExists(name) {
      return this.tabs.some((t) => t == name);
    },
    async getFeedPosts({ cursorId }) {
      return await api.Search.getFeedPosts({
        accountFilter: true,
        cursorId: cursorId,
        sort: "popular",
      });
    },
    async getExplorePosts({ cursorId }) {
      return await api.Search.getFeedPosts({
        cursorId: cursorId,
        sort: "popular",
      });
    },
    async advanceTrendingTags({ cursorId }) {
      return await api.Search.getTrendingTags({ cursorId, limit: 100 });
    },
  },
};
</script>
