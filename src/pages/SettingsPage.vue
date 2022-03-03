<template>
  <v-row>
    <v-col
      :cols="12"
      align="center"
      justify="center"
    >
      <Switch2
        v-model="allowNsfw"
        :label="`Allow NSFW`"
        :help="`Allow displaying NSFW (not safe for work) content`"
      />
      <Switch2
        v-model="blurNsfw"
        :label="`Blur NSFW`"
        :help="`Apply a blur filter overtop NSFW content`"
      />
      <Switch2
        v-model="neutralEngagement"
        :label="`Neutral Engagement`"
        :help="`Hide information such as followers, number of likes, etc.`"
      />
      <Switch2
        v-model="likeNotifications"
        :label="`Like Notifications`"
        :help="`Choose whether likes trigger notifications.`"
      />
    </v-col>
    <v-col :cols="12">
      <v-combobox
        v-model="blockedTags"
        hide-selected
        label="Blocked Tags"
        hint="Press enter to add a new tag"
        multiple
        persistent-hint
        small-chips
      >
        <template v-slot:selection="{ item, parent }">
          <v-chip
            label
            small
          >
            <span class="pr-2">{{ item }}</span>
            <v-icon
              small
              @click="parent.selectItem(item)"
            >
              mdi-delete
            </v-icon>
          </v-chip>
        </template>
      </v-combobox>
    </v-col>
  </v-row>
</template>

<script>
import ServerConfig from "../server/api/config.json";
import api from "../server/api";

import mixins from "../mixins";

import Switch2 from "../components/Switch2";

api;

export default {
  name: "SettingsPage",
  components: {
    Switch2,
  },
  mixins: [mixins.Common, mixins.Meta],
  props: {},
  data: () => ({
    allowNsfw: false,
    blurNsfw: true,
    neutralEngagement: false,
    likeNotifications: true,
    blockedTags: [],
  }),
  computed: {},
  watch: {
    allowNsfw() {
      this.updateSettings();
    },
    blurNsfw() {
      this.updateSettings();
    },
    neutralEngagement() {
      this.updateSettings();
    },
    likeNotifications() {
      this.updateSettings();
    },
    blockedTags() {
      this.updateSettings();
    },
  },
  async created() {},
  async mounted() {
    await this.setMeta({
      title: `Settings - ${ServerConfig.name}`,
    });

    this.setSettings();
  },
  async beforeDestroy() {},
  methods: {
    async setSettings() {
      await this.waitForLoginFinish();

      const settings = this.settings;
      this.allowNsfw = settings.allowNsfw;
      this.blurNsfw = settings.blurNsfw;
      this.neutralEngagement = settings.neutralEngagement;
      this.likeNotifications = settings.likeNotifications ?? true;
      this.blockedTags = Array.from(settings.blockedTags ?? []);

      console.log(settings.blockedTags);
    },
    async updateSettings() {
      const allowNsfw = this.allowNsfw;
      const blurNsfw = this.blurNsfw;
      const neutralEngagement = this.neutralEngagement;
      const likeNotifications = this.likeNotifications;

      let blockedTags = this.blockedTags;
      for (let i = 0; i < blockedTags.length; i++) {
        let tag = blockedTags[i].toLowerCase().trim();
        if (tag.startsWith("#")) tag = tag.substring(1);
        blockedTags[i] = tag;
      }

      const settings = {
        allowNsfw,
        blurNsfw,
        neutralEngagement,
        likeNotifications,
        blockedTags,
      };

      this.$store.commit("set", ["settings", settings]);

      const result = await api.Account.saveSettings(settings);
      console.log(`Saved`, result, settings);
      return result;
    },
  },
};
</script>