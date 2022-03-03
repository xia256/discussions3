<template>
  <Popover
    name="profile"
    @update="updateState"
  >
    <ProfileInfo :username="username" />
  </Popover>
</template>

<script>
import mixins from "../../mixins";

import Popover from "../Popover";
import ProfileInfo from "../ProfileInfo";

export default {
  name: "ProfilePopover",
  components: {
    Popover,
    ProfileInfo,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    username: "",
    resetTimeout: 0,
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    reset() {
      this.username = "";
      this.resetTimeout = 0;
    },
    async updateState({ options }) {
      clearTimeout(this.resetTimeout);

      if (!options) {
        this.resetTimeout = setTimeout(() => this.reset(), 100);
      } else {
        if (this.username != options.username) {
          this.reset();
          this.username = options.username;
        }
      }
    },
  },
};
</script>