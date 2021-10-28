<template>
  <v-row>
    <v-col :cols="12">
      <v-alert color="error lighten-3" class="pa-1">
        <v-card class="master-key" color="error lighten-5" outlined>
          <v-card-text class="font-weight-bold black--text">
            <p>
              WARNING: Recovering requires you to enter your password which
              will be used to decrypt your master key. This will be displayed on
              screen so it is reccomended to only do if it is safe!
            </p>
            <span>Please store your master key safely next time!</span>
          </v-card-text>
        </v-card>
      </v-alert>
      <div class="text-center">
        <ResultText :text="result" />
      </div>
      <v-btn block color="error" class="mt-2" @click="startRecovery">
        Start Recovery
      </v-btn>
    </v-col>
    <v-col :cols="12" v-if="masterKey">
      <h3>Master Key</h3>
      <v-alert color="warning lighten-3" class="pa-1">
        <v-card class="master-key" color="warning lighten-5" outlined>
          <v-card-text class="font-weight-bold black--text">{{ masterKey }}</v-card-text>
        </v-card>
      </v-alert>
    </v-col>
  </v-row>
</template>

<script>
import ResultText from "../../components/ResultText.vue";
import mixins from "../../mixins";

export default {
  name: "WalletRecoverKeyPage",
  components: {
    ResultText,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    result: "",
    masterKey: "",
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async startRecovery() {
      try {
        this.result = "";
        this.masterKey = "";

        const { keyManager } = await this.getPasswordInput();
        
        this.masterKey = keyManager.mnemonic;

      } catch (ex) {
        this.result = ex.toString();
      }
    },
  },
};
</script>