<template>
  <Popover
    name="test"
    @update="updateState"
  >
    <v-card>
      <v-card-text>test</v-card-text>
    </v-card>
  </Popover>
</template>

<script>
import mixins from "../../mixins";

import Popover from "../Popover";

export default {
  name: "ProfilePopover",
  components: {
    Popover,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    reset() {},
    async updateState({ options }) {
      if (!options) {
        //
      } else {
        //
      }
    },
  },
};
</script>