<template>
  <Dialog :min-height="0" v-bind="$attrs" name="sendtip" @update="updateDialog">
    <template v-slot:content>
      <v-card flat>
        <v-card-title>Send Tip</v-card-title>
        <v-card-text>
          <v-row no-gutters>
            <v-col :cols="12">
              <TokenInputField v-model="tipAmount" />
            </v-col>
            <v-col :cols="12">
              <v-btn
                block
                outlined
                color="success"
                @click="nextStep"
                :disabled="waiting"
              >
                <v-progress-circular
                  v-show="waiting"
                  class="mr-2"
                  indeterminate
                />
                <span>Next</span>
              </v-btn>
            </v-col>
            <v-col :cols="12">
              <ResultText class="text-center mt-2" :text="resultText" />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </Dialog>
</template>

<script>
import mixins from "../../mixins";
import Dialog from "../Dialog";
import TokenInputField from "../TokenInputField.vue";
import ResultText from "../ResultText.vue";

import { tryParseJson } from "../../utility";
import api from "../../server/api";

export default {
  name: "ImageUploadDialog",
  components: {
    Dialog,
    TokenInputField,
    ResultText
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    tipAmount: "1.000 ATMOS",
    post: null,
    resultText: "",
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async nextStep() {
      await this.wait(async () => {
        const amount = this.tipAmount;
        const [quantity, symbol] = amount.split(" ");

        const transferData = [
          {
            symbol: symbol,
            quantity: quantity,
            amount: amount,
            recipient: await api.Search.getUserInfo({
              identityPublicKey: this.post.identityPublicKey,
            }),
          },
        ];

        try {
          const transfers = await this.signTransfers(
            transferData,
            this.post?.id
          );

          for (const chain of Object.keys(transfers)) {
            const trx = await api.Crypto.transfer({
              chain,
              actions: transfers[chain],
            });

            const tips = transfers[chain].map((t) => ({
              ...t,
              metadata: tryParseJson(t.metadata),
              txid: trx.transaction_id,
            }));

            this.post?.tips.push(...tips);
          }

          this.closeDialog("sendtip");
        } catch (ex) {
          this.resultText = ex.toString();
        }
      });
    },
    async updateDialog({ isDialogOpen, options }) {
      if (isDialogOpen) {
        this.tipAmount = "1.000 ATMOS";
        this.post = options.post;
        this.resultText = "";
      } else {
        this.post = null;
        this.resultText = "";
      }
    },
  },
};
</script>