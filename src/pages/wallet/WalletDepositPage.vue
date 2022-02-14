<template>
  <div>
    <v-row no-gutters>
      <v-col :cols="12">
        <TokenInputField v-model="depositAmount" />
      </v-col>
      <v-col :cols="12">
        <ConnectWalletButton
          v-show="wallet == null"
          block
          outlined
          :chain="chain"
          @connected="(w) => setWallet(w)"
        />
        <v-btn
          v-if="wallet != null"
          block
          outlined
          color="success"
          @click="deposit"
        >
          Deposit
        </v-btn>
      </v-col>
      <v-col :cols="12">
        <ResultText
          class="text-center"
          :text="resultText"
        />
      </v-col>
    </v-row>
    <v-row
      no-gutters
      class="mt-2"
    >
      <v-col :cols="12">
        <v-card outlined>
          <v-card-title>Manual Instructions</v-card-title>
          <v-card-text>
            <p>
              If you cannot connect your wallet to deposit your tokens, please
              send them to the following contract account with the specified memo.
            </p>
            <v-row no-gutters>
              <v-col :cols="12">
                <v-text-field
                  label="Account"
                  :value="`nsuidcntract`"
                >
                  <template v-slot:append>
                    <v-btn
                      icon
                      @click="$copyText(`nsuidcntract`)"
                    >
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col :cols="12">
                <v-text-field
                  label="Memo"
                  :value="walletLegacyKey"
                >
                  <template v-slot:append>
                    <v-btn
                      icon
                      @click="$copyText(walletLegacyKey)"
                    >
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import mixins from "../../mixins";
import ConnectWalletButton from "../../components/ConnectWalletButton";
import TokenInputField from "../../components/TokenInputField.vue";
import ResultText from "../../components/ResultText.vue";
import { KeyManager } from "../../KeyManager";

export default {
  name: "WalletDepositPage",
  components: {
    ConnectWalletButton,
    TokenInputField,
    ResultText,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    depositAmount: "0.000 ATMOS",
    chain: "EOS",
    wallet: null,
    resultText: "",
  }),
  computed: {
    walletLegacyKey() {
      const walletKey = this.keyManager?.keys["wallet"];
      return walletKey?.pub ? KeyManager.publicKeyToLegacy(walletKey.pub) : "";
    },
  },
  watch: {
    depositAmount() {
      const [, symbol] = this.depositAmount.split(" ");
      const token = this.getToken(symbol);
      this.chain = token.chain;
    },
  },
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async setWallet(wallet) {
      this.wallet = wallet;
    },
    async deposit() {
      const wallet = this.wallet;
      if (!wallet) return;

      try {
        const [depositAmount, depositSymbol] = this.depositAmount.split(" ");
        const token = this.getToken(depositSymbol);

        const tokens = await wallet.eosApi.rpc.get_table_rows({
          json: true,
          code: "nsuidcntract",
          scope: "nsuidcntract",
          index_position: 1,
          limit: "100",
          table: "stats",
          lower_bound: null,
          upper_bound: null,
        });

        const row = tokens.rows.find((r) =>
          r.symbol.endsWith(`,${depositSymbol}`)
        );

        if (!row) throw new Error(`Could not find token information!`);

        const actions = [
          {
            account: row.token_contract,
            name: "transfer",
            authorization: [
              {
                actor: wallet.auth.accountName,
                permission: wallet.auth.permission,
              },
            ],
            data: {
              from: wallet.auth.accountName,
              to: `nsuidcntract`,
              quantity: await this.createAsset(depositAmount, depositSymbol),
              memo: this.walletLegacyKey, // legacy public key format
            },
          },
        ];

        const receipt = await wallet.eosApi.transact(
          { actions },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60,
          }
        );

        //console.log(receipt);

        if (!receipt.transaction_id) {
          throw new Error(`An unknown error has occured`);
        }

        const url = this.transactionUrl(token.chain, receipt.transaction_id);
        this.resultText = `Success! <a href="${url}" target="_blank">View Transaction</a>`;
      } catch (ex) {
        this.resultText = ex.toString();
      }
    },
  },
};
</script>