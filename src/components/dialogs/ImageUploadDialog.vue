<template>
  <Dialog
    v-bind="$attrs"
    :min-height="0"
    name="imageupload"
    @update="updateDialog"
  >
    <template v-slot:content>
      <v-card flat>
        <v-card-title>Image Upload</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="files"
            accept="image/*"
            label="Select image"
          />
          <ResultText
            class="text-center"
            :text="resultText"
          />
          <v-btn
            color="primary"
            :disabled="waiting || !files || files.length <= 0"
            @click="upload()"
          >
            <v-progress-circular
              v-if="waiting"
              class="mr-2"
              indeterminate
            />
            <span>Upload</span>
          </v-btn>
        </v-card-text>
      </v-card>
    </template>
  </Dialog>
</template>

<script>
import axios from "axios";
import mixins from "../../mixins";
import Dialog from "../Dialog";
import ResultText from "../ResultText.vue";

export default {
  name: "ImageUploadDialog",
  components: {
    Dialog,
    ResultText,
  },
  mixins: [mixins.Common],
  props: {},
  data: () => ({
    files: null,
    onUpload: null,
    resultText: "",
  }),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {
    if (this.isSafari) {
      let inputs = document.querySelectorAll(".v-file-input input");
      [...inputs].forEach((input) => {
        input.remove();
      });
    }
  },
  async beforeDestroy() {},
  methods: {
    async upload() {
      try {
        if (!this.files) throw new Error(`No files selected`);
        if (this.files.length > 1) throw new Error(`Only one image can be uploaded at a time`);

        const formData = new FormData();
        formData.append("image", this.files);

        const { data } = await axios.post(
          `https://s2.discussions.app/v1/api/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (data?.error) throw new Error(data.message);

        const fileName = data?.payload?.filename;
        if (!fileName) throw new Error(`An unexpected error has occured!`);
    
        const src = `https://s2.discussions.app/v1/api/upload/file/${fileName}`;

        this.closeDialog("imageupload");
        this.onUpload?.(src);
      } catch (ex) {
        this.resultText = ex.toString();
        console.log(ex);
      }
    },
    async updateDialog({ isDialogOpen, options }) {
      if (isDialogOpen) {
        this.onUpload = options?.onUpload;
      } else {
        this.onUpload = null;
        this.resultText = "";
        this.files = null;
      }
    },
  },
};
</script>