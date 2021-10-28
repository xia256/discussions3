import Vue from 'vue'
import App from './App.vue'

import vuetify from './plugins/vuetify';
import store from './plugins/vuex';
import router from './plugins/router';

import VueGtag from "vue-gtag";
import VueMeta from 'vue-meta';
import VueClipboard from 'vue-clipboard2'
import InfiniteLoading from 'vue-infinite-loading';
import VueQuillEditor from 'vue-quill-editor';

// require styles
import 'quill/dist/quill.core.css';
import 'quill/dist/quill.snow.css';
import 'quill/dist/quill.bubble.css';

async function start() {

  Vue.use(VueGtag, {
    config: { id: "UA-178655433-1" },
    enabled: (window.localStorage["analytics"] != "disabled")
  }, router);

  Vue.use(VueMeta);
  Vue.use(VueClipboard);
  Vue.use(InfiniteLoading, { /* options */ });
  Vue.use(VueQuillEditor, /* { default global options } */);

  Vue.config.productionTip = false;

  /*
        const script = document.createElement("script");
        script.setAttribute("async", "");
        script.setAttribute("src", src);
        script.setAttribute("charset", "utf-8");
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
  */

  return new Vue({
    vuetify,
    store,
    router,
    render: h => h(App)
  }).$mount('#app');

}

start();
