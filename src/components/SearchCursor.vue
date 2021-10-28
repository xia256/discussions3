<template>
  <v-row
    v-bind="$attrs"
    no-gutters
  >
    <v-col :cols="12">
      <slot
        v-if="!top"
        name="content"
        :items="items"
      />
      <v-row no-gutters>
        <v-col
          :cols="12"
          class="pr-2 pl-2"
        >
          <infinite-loading
            ref="infiniteLoading"
            :direction="top ? 'top' : 'bottom'"
            @infinite="infiniteHandler"
          >
            <template slot="spinner">
              <div class="pl-0 pa-2">
                <v-progress-linear
                  indeterminate
                  color="primary"
                  class="ml-2 mr-2"
                />
              </div>
            </template>
            <template slot="no-more">
              <span />
            </template>
            <template slot="no-results">
              <slot name="no-results" />
            </template>
          </infinite-loading>
        </v-col>
      </v-row>
      <slot
        v-if="top"
        name="content"
        :items="items"
      />
    </v-col>
  </v-row>
</template>

<script>
import api from "../server/api";

import { waitFor, isVisible } from "../utility";

import mixins from "../mixins";

export default {
  name: "SearchCursor",
  components: {},
  mixins: [mixins.Common],
  props: {
    advanceCursor: { type: Function, default: () => {} },
    idPredicate: { type: Function, default: null },
    condition: { type: Function, default: () => true },
    top: { type: Boolean, default: false },
  },
  data: () => ({
    ready: false,
    cursorId: null,
    meta: null,
    status: 0,
    items: [],
  }),
  computed: {},
  watch: {
    async isLoggedIn() {
      await this.resetCursor();
    },
  },
  async created() {},
  async mounted() {
    await this.resetCursor();
  },
  async beforeDestroy() {
    await this.disposeCursor(this.cursorId);
  },
  methods: {
    logDebug() {
        const infiniteLoading = this.$refs.infiniteLoading;
        console.log(`infinite loader debug ===`)
        console.log('status', infiniteLoading.status); // 0=ready, loading=1, complete=2, error=3
        console.log('isVisible', isVisible(infiniteLoading.$el));
        console.log('distance', infiniteLoading.getCurrentDistance(), infiniteLoading.distance);
        console.log('=== end debug');
    },
    async resetCursor() {
      this.disposeCursor(this.cursorId); // no need to await this
      this.cursorId = null;
      this.items = [];
      this.status = 0;

      const infiniteLoading = this.$refs.infiniteLoading;
      if (infiniteLoading) {
        // https://github.com/PeachScript/vue-infinite-loading/blob/master/src/components/InfiniteLoading.vue#L258
        // https://github.com/PeachScript/vue-infinite-loading/blob/master/src/utils.js#L119

        await waitFor(0, async () => isVisible(infiniteLoading.$el));
        infiniteLoading.stateChanger.reset();
        //this.logDebug();

      } else {
        //console.log('infiniteLoading doesnt exist');
      }
    },
    async disposeCursor(cursorId) {
      if (!cursorId) return;

      const result = await api.Search.disposeCursor({
        cursorId,
      });

      console.log(`Disposed of cursor id ${cursorId}: ${result}`);
    },
    async infiniteHandler($state) {
      return await this.wait(async () => {
        this.status = 1;

        await this.waitForLoginFinish();

        const { cursorId, results, meta } = await this.advanceCursor(this);

        if (!this.cursorId) this.items = [];
        this.cursorId = cursorId;
        this.meta = meta ?? null;

        const appendItems = (...args) => {
          if (!this.top) this.items.push(...args);
          else this.items.unshift(...args.reverse());
        };

        if (results.length > 0) {
          if (!this.idPredicate) appendItems(...results.filter((r) => this.condition(r)));
          else {
            appendItems(
              ...results.filter(
                (r) =>
                  this.condition(r) &&
                  !this.items.find(
                    (i) => this.idPredicate(i) == this.idPredicate(r)
                  )
              )
            );
          }
          this.status = 2;
          $state.loaded();
        }

        if (!cursorId) {
          this.status = 3;
          $state.complete();
        }
      });
    },
  },
};
</script>