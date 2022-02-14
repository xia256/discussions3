<template>
  <v-row>
    <v-col
      :cols="12"
      :class="{ 'pa-0': isMobile && !isMDPI }"
    >
      <PostScroller
        ref="scroller"
        no-submitter
        :advance-cursor="getTextSearchPosts"
      />
    </v-col>
  </v-row>
</template>

<script>
import api from "../server/api";
import mixins from "../mixins";
import PostScroller from "../components/PostScroller";

export default {
  name: "SearchPage",
  components: {
    PostScroller,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({}),
  computed: {},
  watch: {
    "$route.query.q": async function () {
      await this.$refs.scroller?.resetCursor();
    },
  },
  async created() {},
  async mounted() {
    const q = this.$route.query.q;
    await this.setMeta({
      title: `${q} - Search`
    });
  },
  async beforeDestroy() {},
  methods: {
    async getTextSearchPosts({ cursorId }) {
      return await api.Search.getTextSearchPosts({
        cursorId,
        q: this.$route.query.q,
      });
    },
  },
};
</script>