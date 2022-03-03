<template>
  <v-app-bar
    class="pl-0"
    :hide-on-scroll="isMobile && !isSafari"
    v-bind="$attrs"
    :app="true"
  >
    <div
      v-if="isMobile"
      class="d-flex flex-grow-1"
    >
      <v-row no-gutters>
        <v-col class="text-left">
          <v-avatar :size="48">
            <v-img
              contain
              :src="logo"
              transition="scale-transition"
            />
          </v-avatar>
        </v-col>
        <v-col class="text-center">
          <router-link
            to="/"
            class="text-decoration-none"
          >
            <h1>{{ name }}</h1>
          </router-link>
        </v-col>
        <v-col class="text-right">
          <v-app-bar-nav-icon @click="$emit('drawer')" />
        </v-col>
      </v-row>
    </div>
    <v-row
      v-else
      no-gutters
    >
      <v-col :cols="layout.leftCols">
        <div class="d-flex flex-grow-1 justify-end">
          <div :style="layoutLeftStyle">
            <div :style="`padding: 0 ${isMDPI ? 16 : 8}px`">
              <v-btn
                class="text-h6"
                btn
                text
                plain
                :to="'/'"
              >
                <v-img
                  class="shrink"
                  contain
                  :src="logo"
                  width="40"
                />
                <span
                  v-show="!isMDPI"
                  class="ml-3"
                >{{ name }}</span>
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>
      <v-col
        :cols="layout.rightMiddleCols"
        class="d-flex align-center"
      >
        <div :style="layoutMiddleStyle">
          <v-text-field
            v-model="textSearchQuery"
            class="pl-3 pr-2"
            autocomplete="off"
            :label="`Search`"
            rounded
            small
            dense
            hide-details
            outlined
            @keydown.enter="textSearch"
          >
            <template v-slot:append>
              <v-btn
                small
                dense
                icon
              >
                <v-icon>mdi-magnify</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </div>
        <div :style="layoutRightStyle">
          <div class="d-flex flex-grow-1 justify-end">
            <div v-if="isLoggedIn">
              <Avatar :src="account.avatar" />
              <v-btn
                class="text-none"
                text
                plain
                :to="{
                  name: 'profile',
                  params: { username: account.username },
                }"
              >
                @{{ account.username }}
              </v-btn>
              <v-menu
                v-model="showMessages"
                offset-y
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    text
                    icon
                    color="tertiary"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <v-badge
                      :value="hasUnreadMessages"
                      bordered
                      color="primary"
                      :content="' '"
                      overlap
                    >
                      <v-icon>mdi-message</v-icon>
                    </v-badge>
                  </v-btn>
                </template>
                <v-card
                  outlined
                  class="w-300px"
                >
                  <v-card-text class="pb-0">
                    <ActiveMessengerChats
                      v-if="showMessages"
                      :limit="5"
                      @click-message="
                        (msg) =>
                          $router.push({
                            name: 'messenger',
                            params: { contactName: msg.contactInfo.username },
                          })
                      "
                    />
                  </v-card-text>
                  <v-row>
                    <v-col
                      :cols="12"
                      align="center"
                      justify="center"
                    >
                      <v-btn
                        small
                        dense
                        block
                        text
                        plain
                        :to="{ name: 'messenger' }"
                      >
                        view all
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-menu>
              <v-menu
                v-model="showNotifications"
                offset-y
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    text
                    icon
                    color="tertiary"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <v-badge
                      :value="notificationCount > 0"
                      bordered
                      color="primary"
                      :content="notificationCount"
                      overlap
                    >
                      <v-icon>mdi-bell</v-icon>
                    </v-badge>
                  </v-btn>
                </template>
                <v-card
                  outlined
                  class="w-300px"
                >
                  <Notifications
                    v-if="showNotifications"
                    :limit="5"
                  />
                  <v-row>
                    <v-col
                      :cols="12"
                      align="center"
                      justify="center"
                    >
                      <v-btn
                        small
                        dense
                        block
                        text
                        plain
                        :to="{ name: 'notifications' }"
                      >
                        view all
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-menu>
              <v-btn
                text
                icon
                color="tertiary"
                @click="logout"
              >
                <v-icon>mdi-logout</v-icon>
              </v-btn>
            </div>
            <div v-else>
              <v-btn
                text
                @click="openDialog('login')"
              >
                <v-icon>mdi-logout</v-icon>
                Login
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-app-bar>
</template>

<script>
import { mapState } from "vuex";

import ServerConfig from "../server/api/config.json";

import mixins from "../mixins";

import Avatar from "./Avatar";
import ActiveMessengerChats from "../components/ActiveMessengerChats";
import Notifications from "../components/Notifications";

export default {
  name: "AppBar",
  components: {
    Avatar,
    ActiveMessengerChats,
    Notifications,
  },
  mixins: [mixins.Common, mixins.Login, mixins.Layout],
  props: {},
  data: () => ({
    showMessages: false,
    showNotifications: false,
    logo: ServerConfig.logo,
    name: ServerConfig.name,
    textSearchQuery: "",
  }),
  computed: {
    ...mapState(["notificationCount", "hasUnreadMessages"]),
  },
  watch: {
    "$route.name": function () {
      this.setTextSearchQuery();
    },
  },
  async created() {},
  async mounted() {
    this.setTextSearchQuery();
  },
  async beforeDestroy() {},
  methods: {
    setTextSearchQuery() {
      if (this.$route.name == "search") {
        this.textSearchQuery = this.$route.query.q ?? "";
      } else {
        this.textSearchQuery = "";
      }
    },
    textSearch() {
      this.$router.push({
        name: "search",
        query: { q: this.textSearchQuery ?? "" },
      });
    },
  },
};
</script>