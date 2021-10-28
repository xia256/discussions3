const ThreadsPlugin = require('threads-plugin');

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  "configureWebpack": {
    plugins: [
      new ThreadsPlugin()
    ],
    module: {
      
    }
  }
}