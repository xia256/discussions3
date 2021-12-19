<template>
  <v-form
    v-bind="$attrs"
    @submit.prevent
  >
    <v-text-field
      v-model="communityName"
      autocomplete="off"
      label="Name"
    />
    <v-text-field
      v-model="communityFilter"
      autocomplete="off"
      label="Filter"
    />
    <div
      v-for="(mod, i) in moderators"
      :key="i"
    >
      <UserTextField
        v-model="moderators[i]"
        readonly
        label="Moderator"
        prepend-avatar
      >
        <template v-slot:append-outer>
          <v-btn
            color="red"
            icon
            @click="removeModerator(mod.identityPublicKey)"
          >
            <v-icon>mdi-account-remove</v-icon>
          </v-btn>
        </template>
      </UserTextField>
    </div>
    <UserTextField
      v-model="moderatorInfo"
      label="Add Moderator"
      prepend-avatar
    >
      <template v-slot:append-outer>
        <v-btn
          icon
          @click="addModerator()"
        >
          <v-icon>mdi-account-plus</v-icon>
        </v-btn>
      </template>
    </UserTextField>
    <v-textarea
      v-model="communityDescription"
      label="Description"
    />
    <slot name="result" />
    <v-btn
      :disabled="isWaiting"
      block
      color="primary"
      @click="$emit('submit')"
    >
      <v-progress-circular
        v-if="isWaiting"
        class="mr-2"
        indeterminate
      />
      Submit
    </v-btn>
  </v-form>
</template>

<script>
import mixins from "../mixins";

import UserTextField from "../components/UserTextField";

export default {
  name: "CommunityEditor",
  components: {
    UserTextField,
  },
  mixins: [mixins.Common],
  props: {
    value: { type: Object, default: () => null },
    isWaiting: { type: Boolean, default: false },
  },
  data: () => ({
    communityName: "",
    communityFilter: "",
    communityDescription: "",
    moderators: [],
    moderatorInfo: null,
  }),
  computed: {},
  watch: {
    value() {
      this.setCommunity();
    },
    communityName() {
      this.emitCommunity();
    },
    communityFilter() {
      this.emitCommunity();
    },
    communityDescription() {
      this.emitCommunity();
    },
    moderators() {
      this.emitCommunity();
    },
  },
  async created() {
    if (!this.setCommunity()) {
      this.emitCommunity();
    }
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    setCommunity() {
      if (!this.value?.name) return;

      this.communityName = this.value.name;
      this.communityFilter = this.value.filter;
      this.communityDescription = this.value.description;
      this.moderators = this.value.moderators;

      return true;
    },
    emitCommunity() {
      this.$emit("input", {
        name: this.communityName,
        filter: this.communityFilter,
        description: this.communityDescription,
        moderators: this.moderators,
      });
    },
    removeModerator(idpk) {
      this.moderators = this.moderators.filter(
        ({ identityPublicKey }) => identityPublicKey != idpk
      );
    },
    addModerator() {
      const moderator = this.moderatorInfo;
      if (!moderator?.identityPublicKey) return;

      this.moderatorInfo = null;
      if (
        this.moderators.some(
          (a) => a.identityPublicKey == moderator.identityPublicKey
        )
      )
        return;

      this.moderators.push(moderator);
    },
  },
};
</script>