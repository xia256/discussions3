<template>
  <div class="karuta-card">
    <div class="image-container-overlay">
      <div
        class="card-level"
        :class="{
          blue: card.color == 0,
          green: card.color == 1,
          yellow: card.color == 2,
          red: card.color == 3,
          orange: card.color == 4,
          purple: card.color == 5,
          brown: card.color == 6,
          white: card.color == 7,
        }"
      >
        {{ card.adventurer.level }}
      </div>
    </div>
    <div
      class="image-container"
      :style="`
        background: url('http://cdn.novusphere.io/static/k2/images/${card.image}');
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        `"
    />
    <div class="card-bottom-container">
      <div
        class="text-container name"
        :style="getTextSize(card.characterName)"
      >
        <p class="character-name">
          {{ card.characterName }}
        </p>
      </div>

      <div
        class="text-container series"
        :style="getTextSize(card.seriesName)"
      >
        <p class="series-name">
          {{ card.seriesName }}
        </p>
      </div>
    </div>
    <div class="bottom-bar" />
  </div>
</template>

<script>
export default {
  name: "CardPage",
  components: {},
  mixins: [],
  props: {
    card: { type: Object, required: true },
  },
  data: () => ({
    cards: [],
  }),
  computed: {},
  watch: {},
  async created() {
  },
  async mounted() {
  },
  async beforeDestroy() {},
  methods: {
    getTextSize(text) {
      let size;

      if (text.length <= 8) size = 30;
      else if (text.length <= 13) size = 27;
      else if (text.length <= 22) size = 24;
      else if (text.length <= 30) size = 20;
      else if (text.length <= 36) size = 18;
      else if (text.length <= 50) size = 16;
      else size = 14;

      return `font-size: ${size}px;`;
    },
  },
};
</script>

<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css2?family=Amaranth&display=swap");
.karuta-card {
  border: 4px solid #555;
  margin: 20px;
  width: 225px;
  height: 380px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;

  .image-container {
    position: absolute;
    width: 100%;
    height: 74%;
  }

  .image-container-overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    background: linear-gradient(
        0deg,
        rgba(122, 122, 122, 0.1),
        rgba(122, 122, 122, 0.1)
      ),
      radial-gradient(
        50% 50% at 50% 50%,
        rgba(168, 168, 168, 0) 0%,
        rgba(168, 168, 168, 0.2) 100%
      );
  }

  .card-level {
    z-index: 100;
    box-sizing: content-box;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    font-size: 24px;
    color: white;
    width: 40px;
    height: 40px;
    border: 4px solid #555;
    top: -20px;
    left: -20px;

    /* common.ts - ItemColor */
    &.blue {
      background-color: blue;
    }
    &.green {
      background-color: green;
    }
    &.yellow {
      background-color: yellow;
    }
    &.red {
      background-color: red;
    }
    &.orange {
      background-color: orange;
    }
    &.purple {
      background-color: purple;
    }
    &.brown {
      background-color: brown;
    }
    &.white {
      background-color: white;
    }
  }

  .card-level-max {
    box-sizing: content-box;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #800080;
    font-size: 24px;
    color: white;
    width: 48px;
    height: 48px;
    border: 4px solid #555;
    top: -24px;
    left: -24px;
  }

  .card-bottom-container {
    padding-top: 25px;
    background: linear-gradient(
      180deg,
      rgba(50, 50, 50, 0) 0%,
      rgba(50, 50, 50, 0.2) 11.46%,
      rgba(50, 50, 50, 0.8) 25%,
      #323232 40.1%
    );
    position: absolute;
    bottom: 0;
    height: 160px;
    width: 100%;
  }

  .text-container {
    display: flex;
    justify-content: center;
    z-index: 1;
    width: calc(100% - 10px * 2);
    margin: 0 10px;
    height: 55px;
  }

  .name {
    font-style: italic;
    align-items: flex-end;
    border-bottom: 2px solid white;
  }

  .series {
    align-items: center;
    height: 75px;
  }

  .bottom-bar {
    position: absolute;
    bottom: -20px;
    height: 25px;
    width: calc(100% + 4px * 4);
    background-color: #555;
  }
  .bottom-bar:after {
    content: "";
    width: 60px;
    height: 60px;
    position: absolute;
    right: 0px;
    bottom: 0;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      transparent 50%,
      #555 50%,
      #555 100%
    );
  }

  .character-name,
  .series-name {
    color: white;
    text-align: center;
    font-family: "Amaranth", sans-serif;
  }
}
.absolute {
  position: absolute;
}
.border {
  z-index: 1;
}
</style>