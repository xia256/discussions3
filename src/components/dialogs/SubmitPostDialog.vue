<template>
  <Dialog
    v-bind="$attrs"
    name="submitpost"
    :min-height="0"
    @update="updateDialog"
  >
    <template v-slot:content>
      <PostSubmitter
        ref="submitter"
        :disabled="waiting"
        @submit="submitPost2"
      />
    </template>
  </Dialog>
</template>

<script>
import mixins from "../../mixins";

import Dialog from "../Dialog";
import PostSubmitter from "../PostSubmitter";

export default {
  name: "SubmitPostDialog",
  components: {
    Dialog,
    PostSubmitter,
  },
  mixins: [mixins.Common, mixins.SubmitPost],
  props: {},
  data: () => ({
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    async updateDialog({ isDialogOpen, options }) {
      if (!isDialogOpen) {
        this.$refs.submitter.resultText = "";
      } else {
        if (options?.initialContent) {
          this.$refs.submitter.setHTML(options.initialContent);
        }
      }
    },
    async submitPost2(editor) {
      const { post } = await this.submitPost(editor);
      if (!post) return;

      const href = post.getLink();
      editor.resultText = `Your post has been submitted! <a href="${href}" target="_blank">View</a>`;
    },
  },
};
</script>