<template>
  <div>
    <v-tooltip
      v-model="tooltip"
      :open-on-hover="false"
      bottom
    >
      <template v-slot:activator="{ on }">
        <slot
          name="activator"
          :show="show"
          :hide="hide"
          :on="on"
        />
      </template>
      <span>{{ text }}</span>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  name: "ToolTip",
  components: {},
  mixins: [],
  props: {
    text: { type: String, required: true },
    condition: { type: Boolean, default: false },
  },
  data: () => ({
    hovering: false,
    tooltip: false,
  }),
  computed: {},
  watch: {
    hovering() {
      if (this.hovering) {
        if (this.condition == true) {
          this.tooltip = true;
        }
      } else {
        this.tooltip = false;
      }
    },
  },
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    show() {
      this.hovering = true;
    },
    hide() {
      this.hovering = false;
    },
  },
};
</script>