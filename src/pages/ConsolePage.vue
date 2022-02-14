<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <Switch2
          v-model="lsConsole"
          :label="`LS Console`"
          :help="`Use Local Storage Console logging`"
        />
      </v-col>
      <v-col :cols="12">
        <v-btn block color="primary" @click="exportLog()">Export</v-btn>
      </v-col>
      <v-col :cols="12">
        <v-textarea v-model="log" readonly outlined :rows="20" />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import Switch2 from "../components/Switch2";
import LocalStorageConsole from "../utility/LocalStorageConsole";

export default {
  name: "ConsolePage",
  components: {
    Switch2,
  },
  mixins: [],
  props: {},
  data: () => ({
    lsConsole: window.localStorage["_lsconsole"] ? true : false,
    log: window.localStorage["_lsconsolelog"] ?? "",
  }),
  computed: {},
  watch: {
    lsConsole() {
      if (this.lsConsole) LocalStorageConsole.start();
      else LocalStorageConsole.stop();
    },
  },
  async created() {},
  async mounted() {},
  async beforeDestroy() {},
  methods: {
    exportLog() {
      const fileType = "text/plain;charset=utf-8";
      const blob = new Blob([this.log], { type: fileType });

      const a = document.createElement("a");
      a.download = `lsconsole.txt`;
      a.href = URL.createObjectURL(blob);
      a.dataset.downloadurl = [fileType, a.download, a.href].join(":");
      a.style.display = "none";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    },
  },
};
</script>