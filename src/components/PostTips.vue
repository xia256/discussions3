<template>
  <div>
    <v-chip
      v-for="(tip, i) in summary"
      :key="i"
      small
      outlined
      color="primary"
      class="mr-2"
    >
      <TokenIcon
        class="mr-1"
        :symbol="tip.symbol"
      />
      <span>{{ tip.amount.toFixed(3) }}</span>
    </v-chip>
  </div>
</template>

<script>
import mixins from "../mixins";

import TokenIcon from "./TokenIcon.vue";

export default {
  name: "PostTips",
  components: {
    TokenIcon,
  },
  mixins: [mixins.Common],
  props: {
    tips: { type: Array, required: true }
  },
  data: () => ({
    summary: [],
  }),
  computed: {},
  watch: {
      async tips() {
          await this.load();
      }
  },
  async created() {
      await this.load();
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async load() {
      const summary = {};

      for (const tip of this.tips) {
        const [amount, symbol] = tip.amount.split(" ");
        const [fee] = tip.fee.split(" ");
        const total = parseFloat(amount) + parseFloat(fee);
        summary[symbol] = (summary[symbol] ?? 0) + total;
      }

      const temp = Object.keys(summary).map((symbol) => ({
        symbol,
        amount: summary[symbol],
      }));

      this.summary = temp;
    },
  },
};
</script>