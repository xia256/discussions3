<template>
  <SanitizedHtml
    v-show="text"
    :class="textType"
    :html="text"
  />
</template>

<script>
import SanitizedHtml from "./SanitizedHtml";

export default {
  name: "ResultText",
  components: {
    SanitizedHtml,
  },
  mixins: [],
  props: {
    text: { type: String, default: "" },
  },
  data: () => ({}),
  computed: {
    textType() {
      return this.text.toLowerCase().indexOf("error:") > -1
        ? "error--text"
        : "success--text";
    },
  },
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>