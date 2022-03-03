<template>
  <div class="row">
    <K2Card
      v-for="(card, i) in cards"
      ref="k2Card"
      :key="i"
      :card="card"
    />
  </div>
</template>

<script>
import K2Card from "../../components/K2Card";

export default {
  name: "CardPage",
  components: {
    K2Card,
  },
  mixins: [],
  data: () => ({
    cards: [],
  }),
  computed: {},
  watch: {},
  async created() {
    this.$store.commit("set", ["standalone", true]);

    const cards = [];
    for (let i = 0; i < 3; i++) {
      const json = this.$route.query[`card${i}`];
      if (json) {
        cards.push(JSON.parse(json));
      }
    }

    const testCard = {
      //seriesName: "Uchi no Ko",
      //seriesName: "Uchi no Ko no Tame",
      //seriesName: "Uchi no Ko no Tame naraba,",
      seriesName: "Uchi no Ko no Tame naraba, Ore wa Moshikashitara Maou",

      //seriesName:
      //  "Uchi no Ko no Tame naraba, Ore wa Moshikashitara Maou mo Taoseru kamo Shirenai", // seems text isn't perfect
      image: "1-3.jpg", // try 5 or 7 to break current stuff
      characterName:
        "Super Delicious Planet Golden Special Reserve Gorgeous Aftercare Kit #28",
    };

    this.cards = cards.length ? cards : [testCard, testCard, testCard];
  },
  async mounted() {},
  async beforeDestroy() {},
  methods: {},
};
</script>
<style>
html,
body {
  /*
    Discord's dark mode background color
  */
  background-color: #36393f !important;
}
</style>

<style lang="scss" scoped>
.row {
  display: flex;
}
</style>