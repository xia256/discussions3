<template>
  <v-row>
    <v-col
      :cols="12"
      :class="{ 'pa-0': isMobile && !isMDPI }"
    >
      <PostScroller
        ref="cursor"
        :advance-cursor="getCommunityPosts"
      />
    </v-col>
  </v-row>
</template>

<script>
import api from "../server/api";
import mixins from "../mixins";
import PostScroller from "../components/PostScroller";

export default {
  name: "ViewCommuntiyPage",
  components: {
    PostScroller,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    communityName: "test",
  }),
  computed: {},
  watch: {
    "$route.params.communityName": function() {
      this.setCommunityName();
      this.$refs.cursor?.resetCursor();
    }
  },
  async created() {
    this.setCommunityName();
  },
  async mounted() {
    const name = this.$route.params.communityName;
    const communityInfo = await api.Search.getCommunityInfo({ name });
    if (communityInfo) {
      await this.setMeta({
        title: `${communityInfo.name} - Community`,
        description: communityInfo.description,
        image: communityInfo.logo ? { url: communityInfo.logo, large: true, width: 50, height: 50 } : null 
      });
    }
  },
  async beforeDestroy() {},
  methods: {
    setCommunityName() {
      this.communityName = this.$route.params.communityName;
    },
    async getCommunityPosts({ cursorId }) {
      return await api.Search.getCommunityPosts({
        cursorId: cursorId,
        sort: "popular",
        name: this.communityName,
      });
    },
  },
};
</script>