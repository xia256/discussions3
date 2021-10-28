<template>
  <v-row>
    <v-col cols="auto">
      <v-icon
        v-if="!tagInfo.logo"
        :size="50"
      >
        mdi-pound-box-outline
      </v-icon>
      <Avatar
        v-else
        :size="50"
        :src="tagInfo.logo"
      />
    </v-col>
    <v-col
      class="flex-grow-1"
      align-self="center"
    >
      <router-link
        class="text-decoration-none"
        :to="{ name: 'tag', params: { hashtag: tagInfo.id } }"
      >
        <h1>#{{ tagInfo.id }}</h1>
      </router-link>
      <SanitizedHtml
        class="mt-2"
        :html="tagInfo.description || ''"
      />
    </v-col>
  </v-row>
</template>

<script>
import mixins from "../mixins";

import Avatar from "./Avatar";
import SanitizedHtml from "./SanitizedHtml";

export default {
  name: "TagInfo",
  components: {
    Avatar,
    SanitizedHtml
  },
  mixins: [mixins.Common],
  props: {
    tagInfo: { type: Object, default: null },
  },
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
  },
};
</script>