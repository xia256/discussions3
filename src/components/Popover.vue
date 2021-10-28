<template>
  <v-menu
    v-show="isPopoverOpen"
    v-model="isPopoverOpen"
    v-bind="popoverAttributes"
    :position-x="x"
    :position-y="y"
  >
    <v-card
      @mouseover.native="mouseOverSelfCallback(true)"
      @mouseleave.native="mouseOverSelfCallback(false)"
    >
      <v-card-text>
        <slot />
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script>
import { mapState } from "vuex";
import { Timer } from "../utility";
import mixins from "../mixins";

export default {
  name: "Popover",
  components: {},
  mixins: [mixins.Common],
  props: {
    name: { type: String, required: true },
    closeButton: { type: Boolean, default: true },
    closeButtonAttrs: { type: Object, default: () => ({ text: true }) },
  },
  data: () => ({
    isPopoverOpen: false,
    options: null,
    x: 0,
    y: 0,
    mouseOverSrc: false,
    mouseOverSelf: false,
    autoClose: false,
    closeTimeout: 0,
  }),
  computed: {
    ...mapState(["popovers"]),
    popoverAttributes() {
      const attrs = {
        zIndex: 9999,
        minWidth: 300,
        maxWidth: 300,
        closeOnContentClick: false,
      };
      Object.assign(attrs, this.$attrs);
      return attrs;
    },
  },
  watch: {},
  async created() {},
  async mounted() {
    Timer.start(0, async () => {
      const options = this.popovers[this.name];
      if (!this.isPopoverOpen) {
        if (options) {
          if (this.options?.id == options.id) {
            this.hide();
          } else {
            this.showOrUpdate(options);
          }
        }
      } else {

        if (!options) {
          this.hide();
        } else if (this.options.id != options.id) {
          this.showOrUpdate(options);
        }

        // if we're not mousing over the source or self we trigger a timeout to close the popover
        if (this.autoClose) {
          if (!this.closeTimeout && !this.mouseOverSrc && !this.mouseOverSelf) {
            this.closeTimeout = setTimeout(() => this.hide(), 250);
          }
        }
      }
      return 5;
    });
  },
  async beforeDestroy() {},
  methods: {
    hide() {
      this.hook(this.options?.$el, false);
      this.popovers[this.name] = null;
      this.options = null;
      this.isPopoverOpen = false;
      this.$emit("update", this);
    },
    showOrUpdate(options) {
      this.hook(this.options?.$el, false);
      this.options = options;
      this.x = options.x ?? 0;
      this.y = options.y ?? 0;
      this.isPopoverOpen = true;
      this.hook(this.options?.$el, true);
      this.$emit("update", this);
    },
    hook($el, install) {
      if (!$el) return;
      if (install) {
        this.autoClose = true;
        this.updateMouse(this.mouseOverSelf, true);
        $el.addEventListener("mouseover", this.mouseOverSrcCallback);
        $el.addEventListener("mouseleave", this.mouseLeaveSrcCallback);
      } else {
        $el.removeEventListener("mouseover", this.mouseOverSrcCallback);
        $el.removeEventListener("mouseleave", this.mouseLeaveSrcCallback);
      }
    },
    updateMouse(self, src) {
      this.mouseOverSelf = self;
      this.mouseOverSrc = src;
      if (this.closeTimeout && (self || src)) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = 0;
      }
    },
    mouseOverSelfCallback(value) {
      this.updateMouse(value, this.mouseOverSrc);
    },
    mouseOverSrcCallback() {
      this.updateMouse(this.mouseOverSelf, true);
    },
    mouseLeaveSrcCallback() {
      this.updateMouse(this.mouseOverSelf, false);
    },
  },
};
</script>