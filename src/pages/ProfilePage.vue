<template>
  <div v-if="username">
    <v-row no-gutters>
      <v-col>
        <v-card flat>
          <v-card-text>
            <ProfileInfo
              v-model="profileInfo"
              :more-button="username != account.username"
              :avatar-size="134"
              :username="username"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs v-model="tabIndex">
              <v-tab>Posts</v-tab>
              <v-tab>Replies</v-tab>
              <v-tab>Followers</v-tab>
              <v-tab>Following</v-tab>
              <v-tab v-show="username == account.username">
                Blocked
              </v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        :cols="12"
        :class="{ 'pa-0': isMobile && !isMDPI }"
      >
        <PostScroller
          v-if="tabIndex == 0 || tabIndex == 1"
          ref="scroller"
          no-submitter
          :advance-cursor="getUsersPosts"
        />
        <SearchCursor
          v-else-if="tabIndex == 2 || tabIndex == 3 || tabIndex == 4"
          ref="search"
          :advance-cursor="getUserList"
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
  </div>
</template>

<style lang="scss">
.v-tabs-bar--is-mobile {
  .v-slide-group__prev--disabled {
    display: none !important;
  }
}
</style>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import PostScroller from "../components/PostScroller";
import ProfileInfo from "../components/ProfileInfo";
import SearchCursor from "../components/SearchCursor";

export default {
  name: "ProfilePage",
  components: {
    PostScroller,
    ProfileInfo,
    SearchCursor,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    username: "",
    tabIndex: 0,
    profileInfo: null
  }),
  computed: {},
  watch: {
    async profileInfo() {
      const profileInfo = this.profileInfo;
      if (!this.profileInfo) return;

      const description = profileInfo.biography;
      const title = `@${profileInfo.username} - ${ServerConfig.name}`;
      const image = { url: profileInfo.avatar, large: false, width: 128, height: 128 };

      //console.log({ title, description, image });

      await this.setMeta({ title, description, image });
    },
    "$route.params.username": async function () {
      await this.setData();
      await this.$refs.search?.resetCursor();
      await this.$refs.scroller?.resetCursor();
    },
    async tabIndex() {
      await this.$refs.search?.resetCursor();
      await this.$refs.scroller?.resetCursor();
    },
  },
  async created() {},
  async mounted() {
    await this.setData();
  },
  async beforeDestroy() {},
  methods: {
    async setData() {
      this.username = this.$route.params.username;
      if (this.tabIndex == 4) {
        this.tabIndex = 0;
      }
    },
    async getUserList({ cursorId }) {
      if (this.tabIndex == 2 || this.tabIndex == 3) {
        return await api.Search.getFollow({
          cursorId: cursorId,
          username: this.username,
          following: this.tabIndex == 2 ? false : true,
        });
      }
      else {
        return await api.Search.getBlocked({
          cursorId: cursorId
        });
      }
    },
    async getUsersPosts({ cursorId }) {
      return await api.Search.getUsersPosts({
        topLevelOnly: this.tabIndex == 0 ? true : false,
        cursorId: cursorId,
        sort: "recent",
        usernames: [this.username],
      });
    },
  },
};
</script>