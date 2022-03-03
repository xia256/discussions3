<template>
  <v-text-field
    v-model="amount"
    outlined
    small
    dense
    single-line
    label="Amount"
    :rules="amountRules"
  >
    <template v-slot:append>
      <v-menu
        offset-y
        eager
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            small
            dense
            depressed
            v-bind="attrs"
            v-on="on"
          >
            <TokenIcon :symbol="symbol" />
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="token in tokens"
            :key="token.symbol"
            @click="() => (symbol = token.symbol)"
          >
            <TokenIcon :symbol="token.symbol" />
            <span class="ml-2">{{ token.symbol }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-text-field>
</template>

<script>
import ServerConfig from "../server/api/config.json";
import mixins from "../mixins";
import TokenIcon from "./TokenIcon.vue";

export default {
  name: "TokenInputField",
  components: {
    TokenIcon,
  },
  mixins: [mixins.Common],
  props: {
    value: { type: String, default: "0.000 ATMOS" },
  },
  data: () => ({
    amount: 0,
    symbol: "ATMOS",
    tokens: [],
  }),
  computed: {
    amountRules() {
      const rules = [];
      if (isNaN(this.amount)) {
        rules.push(`Amount must be a number`);
      } else if (parseFloat(this.amount) < 0) {
        rules.push(`Amount must be greater than zero`);
      }
      return rules;
    },
  },
  watch: {
    value() {
      this.setFromValue();
    },
    amount() {
      this.tryEmitInput();
    },
    symbol() {
      this.tryEmitInput();
    },
  },
  async created() {
    this.tokens = ServerConfig.crypto.tokens;
    this.setFromValue();
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    setFromValue() {
      const [amount, symbol] = this.value.split(" ");
      if (Math.abs(parseFloat(this.amount) - parseFloat(amount)) > 0.00001) {
        this.amount = amount;
      }
      if (this.symbol != symbol) {
        this.symbol = symbol;
      }
    },
    async tryEmitInput() {
      if (!isNaN(this.amount)) {
        const input = await this.createAsset(this.amount, this.symbol);
        this.$emit("input", input);
      }
    },
  },
};
</script>