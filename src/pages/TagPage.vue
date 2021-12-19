<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs v-model="tabIndex">
              <v-tab>Threads</v-tab>
              <v-tab>All</v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="12">
        <PostScroller
          ref="scroller"
          no-submitter
          :advance-cursor="getHashtagPosts"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import api from "../server/api";
import mixins from "../mixins";
import PostScroller from "../components/PostScroller";

export default {
  name: "TagPage",
  components: {
    PostScroller,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    tabIndex: 0
  }),
  computed: {},
  watch: {
    "$route.params.hashtag": async function () {
      await this.$refs.scroller.resetCursor();
    },
    async tabIndex() {
      await this.$refs.scroller.resetCursor();
    }
  },
  async created() {},
  async mounted() {
    const hashtag = this.$route.params.hashtag;
    await this.setMeta({ 
       title: `#${hashtag} - Search`
    });
  },
  async beforeDestroy() {},
  methods: {
    async getHashtagPosts({ cursorId }) {
      return await api.Search.getHashtagPosts({
        cursorId: cursorId,
        sort: "popular",
        hashtags: [this.$route.params.hashtag],
        threadOnly: (this.tabIndex == 0) ? true : false
      });
    },
  },
};
</script>