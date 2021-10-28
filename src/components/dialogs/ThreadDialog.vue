<template>
  <Dialog
    v-bind="$attrs"
    name="thread"
    @update="updateDialog"
  >
    <template v-slot:content>
      <Thread
        ref="thread"
        :username="username"
        :encoded-id="encodedId"
      />
    </template>
  </Dialog>
</template>

<script>
import mixins from "../../mixins";
import { PostObject } from "../../server/api/objects";

import Dialog from "../Dialog";
import Thread from "../Thread";

export default {
  name: "ThreadDialog",
  components: {
    Dialog,
    Thread,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    link: "",
    username: "",
    encodedId: "",
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async updateDialog({ isDialogOpen, options }) {
      if (isDialogOpen) {
        const link = PostObject.link(options.username, options.encodedId, options.title);
        this.username = options.username;
        this.encodedId = options.encodedId;
        if (!this.link) {
          //console.log(`pushState`);
          window.history.pushState({ link }, null, link);
          this.link = link;
        } else {
          //console.log(`replaceState`);
          window.history.replaceState({ link }, null, link);
          this.link = link;
        }
      } else {
        const { link } = window.history.state;
        //console.log(link, this.link);
        if (link && this.link == link) {
          //console.log(`back`);
          window.history.back();
        }
        this.link = "";
        this.username = "";
        this.encodedId = "";
      }
    },
  },
};
</script>