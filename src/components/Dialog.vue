<template>
  <v-dialog
    v-model="isDialogOpen"
    v-bind="dialogAttributes"
    @click:outside="clickOutside"
    @keydown.esc="clickOutside"
  >
    <v-card :min-height="minHeight">
      <v-card-title
        color="primary"
        class="pa-0"
      >
        <v-row no-gutters>
          <v-col
            cols="auto"
            class="mr-auto"
          >
            <slot name="title" />
          </v-col>
          <v-col
            cols="auto"
            class="text-right"
          >
            <v-btn
              :disabled="!closeButton"
              v-bind="closeButtonAttrs"
              @click="closeDialog(name)"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-card-title>
      <v-card-text
        class="flex-grow-1 d-flex"
        :class="{ 'pa-0': isMobile && !isMDPI }"
      >
        <v-row
          align="center"
          :style="`max-width: 100%; min-height: ${minHeight}px;`"
        >
          <v-col>
            <slot name="content" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState } from "vuex";
import { Timer } from "../utility";
import mixins from "../mixins";

export default {
  name: "Dialog",
  components: {},
  mixins: [mixins.Common],
  props: {
    name: { type: String, required: true },
    fullScreen: Boolean,
    minHeight: { type: Number, default: 600 },
    closeButton: { type: Boolean, default: true },
    closeButtonAttrs: { type: Object, default: () => ({ text: true }) },
  },
  data: () => ({
    isDialogOpen: false,
    options: null,
  }),
  computed: {
    ...mapState(["dialogs"]),
    dialogAttributes() {
      let attrs;
      if (this.fullScreen || this.isMobile) {
        attrs = {
          scrollable: true,
          fullscreen: true,
          eager: true,
          persistent: true,
          noClickAnimation: true,
        };
      } else {
        attrs = {
          eager: true,
          retainFocus: false,
          persistent: true,
          maxWidth: 600,
        };
      }
      Object.assign(attrs, this.$attrs);
      return attrs;
    },
  },
  watch: {},
  async created() {},
  async mounted() {
    Timer.start(0, async () => {
      const options = this.dialogs[this.name];
      if (options && !this.isDialogOpen) {
        this.isDialogOpen = true;
        this.options = options;
        this.$emit("update", this);
      } else if (!options && this.isDialogOpen) {
        this.isDialogOpen = false;
        this.options = null;
        this.$emit("update", this);
      } else if (options != this.options) {
        this.options = options;
        this.$emit("update", this);
      }
      return 5;
    });
  },
  async beforeDestroy() {},
  methods: {
    async clickOutside({ path }) {
      if (this.closeButton) {
        if (path?.some((node) => node.classList?.contains("v-menu__content")))
          return;

        if (!this.dialogAttributes.persistent)
          return this.closeDialog(this.name);
      }
    },
  },
};
</script>