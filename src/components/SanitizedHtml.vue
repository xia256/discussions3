<template>
  <div
    v-bind="$attrs"
    v-html="sanitizedHtml"
  />
</template>

<script>
import { sanitizeHTML } from "../utility";

export default {
  name: "SanitizedHtml",
  components: {},
  mixins: [],
  props: {
    html: { type: String, default: "" },
  },
  data: () => ({}),
  computed: {
    sanitizedHtml() {
      const sanitized = sanitizeHTML(this.html);
      return sanitized;
    },
  },
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>