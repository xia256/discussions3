<template>
  <router-view v-if="standalone" />
  <v-app v-else>
    <AppBar
      v-if="!isOEmbed"
      v-show="serverConnected"
      flat
      @drawer="showLeftDrawer = true"
    />

    <!-- drawers are only used on mobile ui -->
    <v-navigation-drawer
      v-if="isMobile"
      v-show="serverConnected"
      v-model="showLeftDrawer"
      app
      left
    >
      <AppNavigation />
    </v-navigation-drawer>
    <v-navigation-drawer
      v-if="isMobile"
      v-show="serverConnected"
      v-model="showRightDrawer"
      app
      right
    >
      <div />
    </v-navigation-drawer>

    <LoginDialog />
    <ThreadDialog full-screen />
    <EditProfileDialog />
    <SubmitPostDialog />
    <PasswordDialog />
    <ImageUploadDialog />
    <SendTipDialog />

    <TestPopover />
    <MentionListPopover ref="mentionList" />
    <ProfilePopover />

    <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    %%%%%%%%%%%%%%%%%%%%%%    MAIN APP CONTENT %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
    <v-main>
      <v-container
        fluid
        class="pa-0"
      >
        <v-row
          v-show="serverConnected"
          :no-gutters="!isMobile"
        >
          <v-col
            v-show="layout.showLeft"
            :cols="layout.leftCols"
          >
            <div
              class="d-flex flex-grow-1 justify-end"
              style="position: sticky; top: 64px"
            >
              <div :style="layoutLeftStyle">
                <!--Left side menu for the app navigation with config.-->
                <AppNavigation :icon-only="isMDPI" />
              </div>
            </div>
          </v-col>
          <v-col
            :cols="layout.middleRightCols"
            :class="{ 'pa-0': isMobile && !isMDPI }"
          >
            <v-row no-gutters>
              <v-col :style="layoutMiddleStyle">
                <!--%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
                This is what loads the content of the blockchain.
                %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%-->
                <router-view v-show="serverConnected" />
                
              </v-col>
              <v-col v-show="layout.showRight">
                <div style="position: sticky; top: 64px">
                  <div :style="layoutRightStyle">
                    <!--
                    This section loads the YOU MIGHT LIKE AND TRENDING ELEMENTS. I think it
                    could benefit from connecting Discussions to an RSS feed or similar to keep
                    the users interested when things are slow. Otherwise it doesn't serve much of
                    a purpose yet.
                    <AppRightContent />
                    -->
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    
  </v-app>
</template>

<style lang="scss">
.embedly-card {
  .embedly-card-hug {
    margin: unset !important;
  }

  iframe {
    background-color: white !important;
  }
}

.tertiary--text {
  color: $hiki-tertiary-color !important;
}

.tertiary--background-color {
  background-color: $hiki-tertiary-background-color !important;
}

.w-300px {
  min-width: 300px;
  max-width: 300px;
}

.w-512px {
  min-width: 512px;
  max-width: 512px;
}

.w-95 {
  min-width: 95%;
  max-width: 95%;
}

.v-application a {
  color: $hiki-text-color !important;
}

.row {
  margin: 0px;
}

html,
body {
  background-color: $hiki-background-color;
}

@media only screen and (-webkit-min-device-pixel-ratio: 1.5),
  only screen and (-o-min-device-pixel-ratio: 3/2),
  only screen and (min--moz-device-pixel-ratio: 1.5),
  only screen and (min-device-pixel-ratio: 1.5) {
  html,
  body {
    -webkit-overflow-scrolling: touch;
  }
}
</style>

<script>
import { mapState } from "vuex";

import DOMFixer from "./domfixer";
window._domFixer = new DOMFixer();

import ServerConfig from "./server/api/config.json";
import api from "./server/api";

import { delay } from "./utility";

import mixins from "./mixins";

import AppBar from "./components/AppBar";
import AppNavigation from "./components/AppNavigation";
//import AppRightContent from "./components/AppRightContent";

import LoginDialog from "./components/dialogs/LoginDialog";
import ThreadDialog from "./components/dialogs/ThreadDialog";
import EditProfileDialog from "./components/dialogs/EditProfileDialog";
import SubmitPostDialog from "./components/dialogs/SubmitPostDialog";
import PasswordDialog from "./components/dialogs/PasswordDialog";

import TestPopover from "./components/popovers/TestPopover";
import MentionListPopover from "./components/popovers/MentionListPopover";
import ProfilePopover from "./components/popovers/ProfilePopover";
import ImageUploadDialog from "./components/dialogs/ImageUploadDialog";
import SendTipDialog from "./components/dialogs/SendTipDialog";

export default {
  name: "App",
  components: {
    AppBar,
    AppNavigation,
    //AppRightContent,
    //
    // dialogs
    //
    LoginDialog,
    ThreadDialog,
    EditProfileDialog,
    SubmitPostDialog,
    PasswordDialog,
    //
    // popovers
    //
    TestPopover,
    MentionListPopover,
    ProfilePopover,
    ImageUploadDialog,
    SendTipDialog
  },
  mixins: [mixins.Common, mixins.Login, mixins.Layout],
  props: {},
  data: () => ({
    serverConnected: true,
    showLeftDrawer: false,
    showRightDrawer: false,
  }),
  computed: {
    ...mapState(["dialogs", "popovers", "standalone", "notificationCount", "settings"]),
  },
  watch: {
    $route() {
      if (!this.isMobile) {
        //Watches the layout in case of Desktop app.
        this.layout.showRight = this.$route.meta?.hideRight ? false : true;
      }
    },
    isMobile() {
      if (this.isMobile) {
        this.showLeftDrawer = false;
        this.showRightDrawer = false;
      } else {
        this.layout.showRight = this.$route.meta?.hideRight ? false : true;
      }
    },
    async isLoggedIn() {
      if (this.isLoggedIn == 2) {
        await this.checkNotifications();
        await this.checkUnreadMessages();
      }
    },
  },
  async created() {
    // use a REST request to delay page load for rendertron
    //api.restCall(`/test/waitrender?clientId=${api.clientId}`).then(wr => console.log('waitrender', wr));

    window.$App = this;

    if (this.isOEmbed) {
      this.serverConnected = true;
    }

    if (this.isMobile) {
      this.showLeftDrawer = false;
      this.showRightDrawer = false;
    } else {
      this.layout.showRight = this.$route.meta?.hideRight ? false : true;
    }

    api.addEventListener("connection", this.apiConnectionStatus);
    api.addEventListener("log", this.writeLog);
    api.addEventListener("ready", this.apiReady);
    api.addEventListener("disconnect", this.apiDisconnect);
    api.addEventListener("checkNotifications", this.checkNotifications);
    api.addEventListener("directMessage", this.receiveDirectMessage);

    if (api.isReady) {
      //Verify if the server is online, otherwise...
      this.serverConnected = true;
    } else {
      //Wait for the app to get online.
      await api.connect();
    }
  },
  async mounted() {
    const icon = document.head.querySelector("link[rel='icon']");
    icon.setAttribute("href", ServerConfig.logo);

    if (window.Notification && window.Notification.permission !== "granted") {
      await window.Notification.requestPermission();
    }
  },
  async beforeDestroy() {
    api.removeEventListener("log", this.writeLog);
    api.removeEventListener("ready", this.apiReady);
    api.removeEventListener("disconnect", this.apiDisconnect);
    api.removeEventListener("checkNotifications", this.checkNotifications);
    api.removeEventListener("directMessage", this.receiveDirectMessage);
  },
  methods: {
    async checkNotifications() {
      const identityPublicKey = this.selfIdentityPublicKey;
      const count = await api.Search.getNotificationCount({
        identityPublicKey,
        likeNotifications: this.settings?.likeNotifications
      });

      if (count > this.notificationCount) {
        if (window.Notification && window.Notification.permission == "granted") {
          new window.Notification(
            `You have ${count} new notification${count > 1 ? 's': ''} on ${ServerConfig.name}`
          );
        }
      }

      this.$store.commit("set", ["notificationCount", count]);
    },
    async checkUnreadMessages() {
      const hasUnreadMessages = await api.Search.hasUnreadMessages();
      this.$store.commit("set", ["hasUnreadMessages", hasUnreadMessages]);
    },
    async receiveDirectMessage() {
      if (this.$route.name != "messenger") {
        this.$store.commit("set", ["hasUnreadMessages", true]);
      }
    },
    async apiDisconnect() {
      //this.serverConnected = false;
      if (this.account?.loggedIn) {
        this.account.loggedIn = false;
      }
      document
        .querySelectorAll(".v-dialog")
        .forEach((node) => node.classList.add("d-none"));
    },
    async apiReady() {
      for (let i = 0; i < 3; i++) {
        const { ping, pong } = await api.Utility.ping({
          ping: Date.now(),
        });

        console.log(
          `Server latency=${Date.now() - ping}, delta=${
            Date.now() - pong
          }, random=${Math.random()}`
        );

        await delay(5);
      }

      if (this.keyManager) {
        await this.login(this.keyManager);
      }

      this.serverConnected = true;

      document
        .querySelectorAll(".v-dialog")
        .forEach((node) => node.classList.remove("d-none"));
    },
    writeLog({ detail: args }) {
      console.log(args);
    },
  },
};
</script>
