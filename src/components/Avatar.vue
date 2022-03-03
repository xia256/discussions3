<template>
  <v-avatar
    v-if="src && !failedLoad"
    v-bind="$attrs"
    :size="size"
  >
    <img
      class="v-avatar--img"
      :src="src"
      @error="failedLoad = true"
    >
  </v-avatar>
  <v-icon
    v-else
    :size="size"
    class="white--text"
  >
    {{ defaultIcon }}
  </v-icon>
</template>


<script>
export default {
  name: "Avatar",
  components: {},
  mixins: [],
  props: {
    size: { type: Number, default: 24 },
    src: { type: String, default: "" },
    defaultIcon: { type: String, default: "mdi-account-circle-outline" }
  },
  data: () => ({
    failedLoad: false,
  }),
  computed: {},
  watch: {
    src() {
      this.failedLoad = false;
    },
  },
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>
