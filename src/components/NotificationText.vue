<template>
  <div>
  <span v-if="relatedIdentities.length == 1">
    <router-link
      class="text-decoration-none"
      :to="{ name: 'profile', params: { username: lastUsername } }"
      @mouseover.native="(e) => openProfilePopover(e, lastUsername)"
    >
      <strong>@{{ lastUsername }}</strong>
    </router-link>
    <slot />
  </span>
  <span v-else-if="relatedIdentities.length == 2">
    <router-link
      class="text-decoration-none"
      :to="{ name: 'profile', params: { username: lastUsername } }"
      @mouseover.native="(e) => openProfilePopover(e, lastUsername)"
    >
      <strong>@{{ lastUsername }}</strong>
    </router-link>
    and
    <router-link
      class="text-decoration-none"
      :to="{ name: 'profile', params: { username: secondLastUsername } }"
      @mouseover.native="(e) => openProfilePopover(e, secondLastUsername)"
    >
      <strong>@{{ secondLastUsername }}</strong>
    </router-link>
    <slot />
  </span>
  <span v-else>
    <router-link
      class="text-decoration-none"
      :to="{ name: 'profile', params: { username: lastUsername } }"
      @mouseover.native="(e) => openProfilePopover(e, lastUsername)"
    >
      <strong>@{{ lastUsername }}</strong>
    </router-link>
    <span> and {{ relatedIdentities.length - 1 }} others</span>
    <slot />
  </span>
  <span v-if="updatedAt" class="d-block tertiary--text">{{  shortDateString }}</span>
  </div>
</template>

<script>
import mixins from "../mixins";
import { shortDateString } from "../utility";

export default {
  name: "NotificationText",
  components: {},
  mixins: [mixins.Common],
  props: {
    relatedUsernames: { type: Array, default: () => [] },
    relatedIdentities: { type: Array, default: () => [] },
    updatedAt: { type: Number, default: 0 }
  },
  data: () => ({}),
  computed: {
    lastUsername() {
      return this.relatedUsernames[this.relatedUsernames.length - 1];
    },
    secondLastUsername() {
      return this.relatedUsernames[this.relatedUsernames.length - 2];
    },
    shortDateString() {
      return shortDateString(new Date(this.updatedAt));
    }
  },
  watch: {},
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>