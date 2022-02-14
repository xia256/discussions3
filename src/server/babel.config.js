module.exports = {
    "plugins": [
        ["@babel/plugin-proposal-decorators", { legacy: true }],
        ["@babel/plugin-proposal-class-properties", {}],
        ["@babel/plugin-proposal-private-methods", {}]
    ],
    "presets": [
        "@babel/preset-env"
    ]
}