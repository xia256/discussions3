<template>
  <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
  <!--%%%%%%%%%%%%%%%%%%%%%%  POSTS GET LOADED HERE %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
  <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
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

        <div>
          <v-tabs>
              <v-tab>
                <!--This button sorts posts by Popular-->
                <v-btn
                  rounded
                  color="primary"
                  block
                  @click="changePostOrder('popular')"
                  >
                  <span>Popular</span>
                </v-btn>
              </v-tab>
              <v-tab>
                <!--This button orders posts by date-->
                <v-btn
                  rounded
                  color="primary"
                  block
                  @click="changePostOrder('recent')"
                  >
                  <span>Recent</span>
                </v-btn>

              </v-tab>
            </v-tabs>

        </div>


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

export default {
  name: "ExplorePage",
  components: {
    SearchCursor,
    PostScroller,
    TagInfo,
    ReccomendUsers,
    ReccomendCommunities,
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
    },
    postSort: "recent",
  }),
  computed: {
    tabName() {
      return this.tabs[this.tabIndex];
    },
    tabs() {
      //If the user is logged in, return the following tabs.
      if (this.isLoggedIn)
        return ["feed", "popular", "trending", "users", "community"];
      //Otherwise, only show those not related to his/her account.
      else return ["popular", "trending", "community"];
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
    this.setSettings();
  },
  methods: {
    tabExists(name) {
      return this.tabs.some((t) => t == name);
    },
    async getFeedPosts({ cursorId }) {
      //console.log(this.postSort);
      return await api.Search.getFeedPosts({
        accountFilter: true,
        cursorId: cursorId,
        sort: this.postSort,
      });
    },
    //Loads the posts from the Explore window.
    async getExplorePosts({ cursorId }) {
      //console.log(this.postSort);
      return await api.Search.getFeedPosts({
        cursorId: cursorId,
        sort: this.postSort,
      });
    },
    //Property to load Settings to the Explore page.
    async setSettings(){
      await this.waitForLoginFinish();
      if(this.isLoggedIn){
        //Load the Settings related to the post Order.
        const settings = this.settings;
        if(settings.postSort !== undefined){
          this.postSort = settings.postSort;
        }
        else{
          this.postSort = "popular";
        }
      }else{
        //Otherwise user is not logged in and this load 'popular' as default.
        this.postSort = "popular";
      }
      //console.log(this.postSort);
    },
    //Property to modify the post order.
    async changePostOrder(postNSort){
      this.postSort = postNSort;

      //Verify if the user is logged in to load the Settings.
      if (this.isLoggedIn){
        //Store in Settings so it loads the same post order the next time the user logs in.
        await this.updateSingleSetting("postSort", this.postSort);
      }
      //console.log("POST SORT:");
      //console.log(this.postSort);
      return this.postSort;
    },

    async advanceTrendingTags({ cursorId }) {
      return await api.Search.getTrendingTags({ cursorId, limit: 100 });
    },
  },
};
</script>
