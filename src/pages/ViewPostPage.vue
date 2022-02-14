<template>
  <v-row>
    <v-col :cols="12">
      <Thread
        ref="thread"
        v-model="posts"
        :no-replies="isOEmbed"
        :encoded-id="encodedId"
        :username="username"
      />
    </v-col>
  </v-row>
</template>

<script>
import mixins from "../mixins";

import {
  isOEmbeddable,
  YOUTUBE_REGEX,
  YOUTUBE_SHORT_REGEX,
} from "../server/api/oembed";

import Thread from "../components/Thread";

export default {
  name: "ViewPostPage",
  components: {
    Thread,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    video: null,
    posts: [],
    encodedId: "",
    username: "",
  }),
  computed: {},
  watch: {
    "$route.params.encodedId": function () {
      this.setData();
    },
    "$route.params.username": function () {
      this.setData();
    },
    async posts() {
      const post = this.posts[this.posts.length - 1];
      const description = post?.plainText ?? "";
      const title = description;
      const video = await this.getVideoMeta();
      let image = null;

      if (video?.image) {
        image = {
          url: video.image,
          large: true,
          width: video.width,
          height: video.height,
        };
      }

      if (!image) {
        const url = post?.document.querySelector("img")?.getAttribute("src");
        if (url) {
          image = {
            url: url,
            large: true,
            width: 1280,
            height: 720,
          };
        }
      }

      //console.log({ title, description, image, video });

      await this.setMeta({ title, description, image, video });
    },
  },
  async created() {
    if (this.isOEmbed) {
      //
    }
  },
  async mounted() {
    this.setData();
  },
  async beforeDestroy() {},
  methods: {
    setData() {
      this.encodedId = this.$route.params.encodedId;
      this.username = this.$route.params.username;
    },
    async getVideoMeta() {
      let video = null;
      const post = this.posts[this.posts.length - 1];

      if (post) {
        const hrefs = Array.from(post.document.querySelectorAll("a"))
          .map((n) => n.getAttribute("href"))
          .filter((href) => isOEmbeddable(href));

        for (const href of hrefs) {
          if (new RegExp(YOUTUBE_REGEX).test(href)) {
            const ytvid = href.substring(href.indexOf("v=") + 2).split("&")[0];

            video = {
              url: `https://www.youtube.com/embed/${ytvid}`,
              image: `https://i.ytimg.com/vi/${ytvid}/maxresdefault.jpg`,
              width: 1280,
              height: 720,
            };
          } else if (new RegExp(YOUTUBE_SHORT_REGEX).test(href)) {
            const ytvid = href.split("/")[3].split("?")[0];

            video = {
              url: `https://www.youtube.com/embed/${ytvid}`,
              image: `https://i.ytimg.com/vi/${ytvid}/maxresdefault.jpg`,
              width: 1280,
              height: 720,
            };
          }

          if (video) break;
        }
      }

      return video;
    },
  },
};
</script>
