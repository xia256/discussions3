<template>
  <div>
    <v-row no-gutters>
      <v-col :cols="12">
        <TokenInputField v-model="withdrawAmount" />
      </v-col>
      <v-col :cols="12">
        <v-text-field
          v-model="withdrawAccount"
          outlined
          small
          dense
          single-line
          label="Account"
        />
      </v-col>
      <v-col :cols="12">
        <v-btn
          block
          outlined
          color="success"
          @click="withdraw"
        >
          <v-progress-circular
            v-show="waiting"
            class="mr-2"
            indeterminate
          />
          <span>Withdraw</span>
        </v-btn>
      </v-col>
      <v-col :cols="12">
        <ResultText
          class="text-center"
          :text="resultText"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { UnifiedIdTransfer } from "../../KeyManager/UnifiedIdTransfer";

import api from "../../server/api";
import ServerConfig from "../../server/api/config.json";

import mixins from "../../mixins";
import TokenInputField from "../../components/TokenInputField.vue";
import ResultText from "../../components/ResultText.vue";

export default {
  name: "WalletWithdrawPage",
  components: {
    TokenInputField,
    ResultText,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    withdrawAmount: "0.000 ATMOS",
    withdrawAccount: "",
    resultText: "",
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async withdraw() {
      return await this.wait(async () => {
        try {
          this.resultText = "";

          if (!this.withdrawAccount) throw new Error(`Invalid account`);

          const [withdrawAmount, withdrawSymbol] =
            this.withdrawAmount.split(" ");

          if (isNaN(withdrawAmount) || withdrawAmount <= 0 || !withdrawSymbol)
            throw new Error(`Invalid withdraw amount`);

          const amount = await this.createAsset(withdrawAmount, withdrawSymbol);
          const fee = await this.createAsset(0, withdrawSymbol);

          const { keyManager } = await this.getPasswordInput({
            withdraw: {
              amount: amount,
              fee: fee,
              account: this.withdrawAccount,
            },
          });

          const walletKey = keyManager.keys["wallet"];

          const token = ServerConfig.crypto.tokens.find(
            (t) => t.symbol == withdrawSymbol
          );

          const transfer = new UnifiedIdTransfer({
            chain: token.chainId,
            recipientAccount: this.withdrawAccount,
            amount: amount,
            fee: fee,
            nonce: Date.now(),
          });

          //console.log(transfer);

          const actions = [await transfer.sign(walletKey)];

          const receipt = await api.Crypto.transfer({
            chain: token.chain,
            actions,
          });
          if (!receipt.transaction_id) {
            throw new Error(`An unknown error has occured`);
          }

          const url = this.transactionUrl(token.chain, receipt.transaction_id);
          this.resultText = `Success! <a href="${url}" target="_blank">View Transaction</a>`;
        } catch (ex) {
          this.resultText = ex.toString();
        }
      });
    },
  },
};
</script>