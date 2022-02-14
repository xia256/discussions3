<template>
  <div>
    <v-menu offset-y>
      <template v-slot:activator="{ on }">
        <v-btn
          v-bind="$attrs"
          v-on="on"
        >
          <v-progress-circular
            v-show="waiting"
            class="mr-2"
            indeterminate
          />
          <span><v-icon>mdi-wallet</v-icon> Connect</span>
        </v-btn>
      </template>
      <v-list v-if="chain == 'EOS' || chain == 'TLOS'">
        <v-list-item>
          <v-btn
            class="wallet--button"
            block
            @click="connectWallet('anchor-link')"
          >
            <img src="https://discussions.app/static/wallet/anchor.png">
            <span>Anchor</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn
            class="wallet--button"
            block
            @click="connectWallet('scatter')"
          >
            <img src="https://discussions.app/static/wallet/scatter.png">
            <span>Scatter</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn
            class="wallet--button"
            block
            @click="connectWallet('scatter')"
          >
            <img src="https://discussions.app/static/wallet/wombat.png">
            <span>Wombat</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style lang="scss" scoped>
.wallet--button {
  img {
    width: 24px;
    height: 24px;
    margin-right: 8px;
  }
}
</style>

<script>
import mixins from "../mixins";
import { initAccessContext } from "eos-transit";
import scatter from "eos-transit-scatter-provider";
import anchor from "eos-transit-anchorlink-provider";

const DEFAULT_EOS_RPC = "https://eos.greymass.com";
const DEFAULT_TELOS_RPC = "https://telos.greymass.com";
const EOS_CHAIN_ID =
  "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";
const TELOS_CHAIN_ID =
  "4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11";

export default {
  name: "ConnectWalletButton",
  components: {},
  mixins: [mixins.Common],
  props: {
    chain: { type: String, default: "EOS" }
  },
  data: () => ({
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async connectWallet(walletName) {
      if (this.chain == "EOS" || this.chain == "TLOS")
        return await this.connectEosWallet(walletName);
    },
    async connectEosWallet(walletName) {
      return await this.wait(async () => {
        let rpc = DEFAULT_EOS_RPC;
        let chainId = EOS_CHAIN_ID;

        if (this.chain == "TLOS") {
          rpc = DEFAULT_TELOS_RPC;
          chainId = TELOS_CHAIN_ID;
        }

        const accessContextOptions = {
          appName: "Discussions",
          network: {
            protocol: rpc.substring(0, rpc.indexOf(":")),
            host: rpc.substring(rpc.indexOf(":") + 3),
            port: 443,
            chainId: chainId,
          },
          walletProviders: [anchor(`discussions`), scatter()],
        };

        const accessContext = initAccessContext(accessContextOptions);
        const walletProviders = accessContext.getWalletProviders();
        const selectedProvider = walletProviders.find(
          (wp) => wp.id == walletName
        );

        const wallet = accessContext.initWallet(selectedProvider);
        console.log("Connecting wallet...");
        await wallet.connect();
        if (walletName == "scatter") {
          console.log("Logging out of scatter...");
          await wallet.logout();
        }
        console.log("Logging into wallet...");
        await wallet.login();

        this.$emit("connected", wallet);
      });
    },
    async connectEthWallet(walletName) {
      walletName;
      return;
    },
  },
};
</script>