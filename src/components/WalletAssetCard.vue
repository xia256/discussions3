<template>
  <v-card v-bind="$attrs">
    <v-list-item three-line>
      <v-list-item-content>
        <v-list-item-title class="headline mb-1">
          {{ symbol }}
        </v-list-item-title>
        <v-list-item-subtitle>{{ balance }}</v-list-item-subtitle>
        <v-list-item-subtitle class="small--text">
          {{ lastPrice.toFixed(6) }} {{ symbol }}/USD
        </v-list-item-subtitle>
        <v-list-item-subtitle class="small--text">
          <span
            :class="{ 'success--text': change >= 0, 'error--text': change < 0 }"
          >
            {{ `${change >= 0 ? "+" : ''}${(change * 100).toFixed(2)}%` }}
          </span>
        </v-list-item-subtitle>
      </v-list-item-content>
      <div>
        <TokenIcon
          :size="80"
          :symbol="symbol"
        />
      </div>
    </v-list-item>
  </v-card>
</template>

<style lang="scss" scoped>
.small--text {
  font-size: 10px;
}
</style>

<script>
import ecc from "eosjs-ecc";

import sapi from "../server/api";

import mixins from "../mixins";
import TokenIcon from "./TokenIcon.vue";

export default {
  name: "WalletAssetCard",
  components: {
    TokenIcon,
  },
  mixins: [mixins.Common],
  props: {
    symbol: { type: String, default: "" },
  },
  data: () => ({
    icon: "",
    balance: "",
    lastPrice: 0,
    change: 0,
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
      
      sapi.Crypto.tickers().then((tickers) => {
        //console.log(tickers);

        const ticker = tickers.find((t) => t.symbol == this.symbol);
        if (ticker) {
          this.change = Math.floor(parseFloat(ticker.change) * 10000) / 10000;
          this.lastPrice = parseFloat(ticker.last);
        }
      });

      const walletKey = this.keyManager?.keys["wallet"];
      if (!walletKey) return;

      const token = this.getToken(this.symbol);
      if (!token) return;

      const api = await this.getEosioApi(token.chain);
      const bound = `0x${ecc.sha256(
        new ecc.PublicKey(walletKey.pub).toBuffer(),
        "hex"
      )}`;

      const balances = await api.rpc.get_table_rows({
        json: true,
        code: `nsuidcntract`,
        scope: token.chainId,
        table: "accounts",
        limit: 1,
        key_type: "i256",
        lower_bound: bound,
        upper_bound: bound,
        index_position: 2,
      });

      if (balances.rows && balances.rows.length > 0) {
        this.balance = balances.rows[0].balance;
      } else {
        this.balance = await this.createAsset(0, this.symbol);
      }
    },
  },
};
</script>
