<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card flat>
          <v-card-text class="pt-0 pb-0">
            <v-tabs>
              <v-tab :to="{ name: 'assets' }">
                Assets
              </v-tab>
              <v-tab :to="{ name: 'deposit' }">
                Deposit
              </v-tab>
              <v-tab :to="{ name: 'withdraw' }">
                Withdraw
              </v-tab>
              <v-tab :to="{ name: 'recoverkey' }">
                Recover
              </v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12">
        <router-view />
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  name: "WalletPage",
  components: {},
  mixins: [],
  props: {},
  data: () => ({
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {
  },
  async beforeDestroy() {},
  methods: {},
};
</script>