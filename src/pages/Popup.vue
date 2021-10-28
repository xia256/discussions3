<template>
  <v-row>
    <v-col
      :cols="12"
      align="center"
      justify="center"
    >
      <h1>This window should close in a moment...</h1>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: "Popup",
  components: {},
  mixins: [],
  props: {},
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {
    window.close();
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>