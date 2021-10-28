<template>
  <SearchCursor :advance-cursor="getNotifications">
    <template v-slot:content="{ items }">
      <v-row
        v-for="(n, i) in items"
        :key="i"
        no-gutters
      >
        <template v-if="n.type == 'mention'">
          <v-col cols="auto">
            <v-card flat>
              <v-card-text>
                <Avatar
                  :size="48"
                  :src="n.post.avatar"
                />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col class="flex-grow-1">
            <Post
              v-if="verbose"
              no-avatar
              flat
              :post="n.post"
            />
            <v-card v-else>
              <v-card-text>
                <NotificationText
                  :updated-at="n.updatedAt"
                  :related-usernames="n.relatedUsernames"
                  :related-identities="n.relatedIdentities"
                >
                  tagged you in a <a
                    href="javascript:void(0)"
                    @click="openThread(n.post)"
                  >post</a>
                </NotificationText>
              </v-card-text>
            </v-card>
          </v-col>
        </template>
        <template v-else-if="n.type == 'like'">
          <v-col cols="auto">
            <v-card flat>
              <v-card-text>
                <v-icon :size="48">
                  mdi-heart
                </v-icon>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col class="flex-grow-1">
            <v-card>
              <v-card-text>
                <NotificationText
                  :updated-at="n.updatedAt"
                  :related-usernames="n.relatedUsernames"
                  :related-identities="n.relatedIdentities"
                >
                  liked a <a
                    href="javascript:void(0)"
                    @click="openThread(n.post)"
                  >post</a> you made
                </NotificationText>
              </v-card-text>
            </v-card>
            <Post
              v-if="verbose"
              no-avatar
              content-class="tertiary--text"
              flat
              :post="n.post"
            />
          </v-col>
        </template>
        <template v-else-if="n.type == 'follow'">
          <v-col cols="auto">
            <v-card flat>
              <v-card-text>
                <v-icon :size="48">
                  mdi-account-multiple-plus
                </v-icon>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col class="flex-grow-1">
            <v-card flat>
              <v-card-text>
                <NotificationText
                  :updated-at="n.updatedAt"
                  :related-usernames="n.relatedUsernames"
                  :related-identities="n.relatedIdentities"
                >
                  have followed you
                </NotificationText>
              </v-card-text>
            </v-card>
          </v-col>
        </template>
      </v-row>
    </template>
  </SearchCursor>
</template>

<script>
import api from "../server/api";
import { PostObject } from "../server/api/objects";

import mixins from "../mixins";

import SearchCursor from "../components/SearchCursor";
import Avatar from "../components/Avatar";
import Post from "../components/Post";
import NotificationText from "../components/NotificationText";

export default {
  name: "NotificationsPage",
  components: {
    SearchCursor,
    Avatar,
    Post,
    NotificationText,
  },
  mixins: [mixins.Common],
  props: {
    limit: { type: Number, default: 0 },
    verbose: { type: Boolean, default: false },
  },
  data: () => ({}),
  computed: {},
  watch: {},
  async created() {},
  async mounted() {
    this.$store.commit("set", ["notificationCount", 0]); // mark all as seen
  },
  async beforeDestroy() {},
  methods: {
    async getNotifications({ cursorId: oldCursorId }) {
      const { cursorId, results } = await api.Search.getNotifications({
        cursorId: oldCursorId,
        limit: this.limit,
      });

      console.log(results);

      return {
        cursorId,
        results: results.map((n) => ({
          ...n,
          post: n.post ? new PostObject(n.post) : null,
        })),
      };
    },
  },
};
</script>