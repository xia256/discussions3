<template>
  <div>
    <WalletAssetCard
      v-for="s in symbols"
      :key="s"
      class="mb-2"
      outlined
      :symbol="s"
    />
  </div>
</template>

<script>
import WalletAssetCard from "../../components/WalletAssetCard.vue";
import ServerConfig from "../../server/api/config.json";

export default {
  name: "WalletPage",
  components: {
    WalletAssetCard,
  },
  mixins: [],
  props: {},
  data: () => ({
    symbols: [],
  }),
  computed: {},
  watch: {},
  async created() {
    this.symbols = ServerConfig.crypto.tokens.map(t => t.symbol);
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>