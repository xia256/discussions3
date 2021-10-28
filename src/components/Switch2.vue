<template>
  <div>
    <v-switch
      v-model="model"
      v-bind="$attrs"
    > 
      <template v-slot:label>
        <span>{{ label }}</span>
        <v-tooltip
          v-if="help"
          right
        >
          <template v-slot:activator="{ on, attrs }">
            <v-icon
              class="ml-2"
              v-bind="attrs"
              v-on="on"
            >
              mdi-help-circle-outline
            </v-icon>
          </template>
          <span>{{ help }}</span>
        </v-tooltip>
      </template>
    </v-switch>
  </div>
</template>

<script>
export default {
  name: "Switch2",
  components: {},
  mixins: [],
  props: {
    label: { type: String, required: true },
    value: { type: Boolean, default: false },
    help: { type: String, default: "" },
  },
  data: () => ({
    model: false,
  }),
  computed: {},
  watch: {
    model() {
      this.$emit("input", this.model);
    },
    value() {
      this.model = this.value;
    },
  },
  async created() {
    this.model = this.value;
  },
  async mounted() {},
  async beforeDestroy() {},
};
</script>