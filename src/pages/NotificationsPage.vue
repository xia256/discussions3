<template>
  <Notifications verbose />
</template>

<script>
import ServerConfig from "../server/api/config.json";

import mixins from "../mixins";

import Notifications from "../components/Notifications";

export default {
  name: "NotificationsPage",
  components: {
    Notifications,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {
  },
  async mounted() {
    await this.setMeta({
      title: `Notifications - ${ServerConfig.name}`
    });
  },
  async beforeDestroy() {},
  methods: {
  },
};
</script>