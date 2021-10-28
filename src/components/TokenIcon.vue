<template>
  <v-avatar
    v-if="icon"
    :size="size ? size : 24"
  >
    <img :src="icon">
  </v-avatar>
</template>

<script>
import mixins from "../mixins";

export default {
  name: "TokenIcon",
  components: {},
  mixins: [ mixins.Common ],
  props: {
    symbol: { type: String, default: "" },
    size: { type: Number, default: 24 },
  },
  data: () => ({
    icon: "",
  }),
  watch: {
    async symbol() {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      const symbol = this.symbol.toUpperCase();
      const token = this.getToken(symbol);
      const defaultToken = this.getToken('ATMOS');

      //console.log(token);

      this.icon = token?.icon ?? defaultToken?.icon;
    },
  },
};
</script>
