module.exports = {
    "extends": [
        'eslint:recommended',
        'plugin:vue/recommended'
    ],
    "parser": "vue-eslint-parser",
    "parserOptions": {
        "parser": "@babel/eslint-parser",
        "sourceType": "module"
    },
    "env": {
        "browser": true,
        "amd": true,
        "node": true
    },
    "rules": {
        "no-dupe-class-members": "warn"
    }
};