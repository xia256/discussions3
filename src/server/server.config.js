import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
const { argv } = yargs(process.argv);

const CONFIG_SECRET_JSON = path.join(__dirname, `${argv.secretConfig ?? 'config'}.secret.json`);
//console.log(CONFIG_SECRET_JSON, argv.secretConfig);

const config = {
    name: "Discussions",
    description: "Just some random social website",
    logo: "https://cdn.novusphere.io/static/atmos2.png",
    genesis: 1483246800000, // 2017-1-1
    url: "http://localhost:5015",
    rendertron: "http://localhost:8010/render",
    api: "/api/v1",
    salt: 'discussions3',
    port: 5015,
    globalModerators: [
        'PUB_K1_7RWM4YvxcUEhZfHozf8XVajgvfh8wvohoJS9vx8Hg1K15W8NGQ', // Novusphere_Paul
        'PUB_K1_5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgyfhY3L7', // xia256
        'PUB_K1_6sYMyMHzHhGtfwjCcZkRaw3YK5ws8xoD6ke2DNUmnHT3e399hy', // Brian_Novusphere
    ],
    passport: {
        twitter: { consumerKey: '', consumerSecret: '' },
        discord: { clientID: '', clientSecret: '', scope: ['identify', 'email', 'guilds'] },
        reddit: { clientID: '', clientSecret: '', scope: ['mysubreddits'] }
    },
    crypto: {
        eos: {
            rpc: "https://eos.greymass.com",
            relayKey: "",
            relayAccount: "eosforumanon",
            relayPermission: "active",
            relayPublicKey: "EOS7YrEup7dQ82v3wF3RjxXe7RG3yosz1SXVRjMwgT1fdHsgHZ8MJ"
        }, 
        tlos: {
            rpc: "https://telos.greymass.com",
            relayKey: "",
            relayAccount: "eosforumanon",
            relayPermission: "active",
            relayPublicKey: "EOS7YrEup7dQ82v3wF3RjxXe7RG3yosz1SXVRjMwgT1fdHsgHZ8MJ"
        },
        tokens: [
            { symbol: "ATMOS", chain: "EOS", chainId: 0, precision: 3, icon: "https://cdn.novusphere.io/static/atmos.svg" },
            { symbol: "EOS", chain: "EOS", chainId: 1, precision: 4, icon: "https://s2.discussions.app/v1/api/upload/file/1581028911491.png" },
            { symbol: "TLOS", chain: "TLOS", chainId: 0, precision: 4, icon: "https://s2.discussions.app/v1/api/upload/file/1635454152901.png" },
        ]
    },
    mongodb: {
        connection: "mongodb://localhost:27017",
        database: "discussions3",
        collections: {
            oauths: "oauths",
            accounts: "accounts",
            posts: "posts",
            actions: "actions",
            hashtags: "hashtags",
            notifications: "notifications",
            messages: "messages",
            communities: "communities",
            proposals: "proposals"
        },
        indexes: {
            oauths: [
                { "activeIdentityPublicKey": 1 },
                { "profile.guilds.id": 1 },
                { "profile.subreddits": 1 },
            ],
            accounts: [
                { "identityPublicKey": 1 },
                { "username": 1 },
            ],
            posts: [
                { "id": 1 },
                { "identityPublicKey": 1 },
                { "createdAt": -1 },
                { "username": 1 },
                { "parentId": 1 },
                { "threadId": 1 },
                { "hashtags": 1 },
                { "ignoredBy": 1 },
                { "pinned": -1 },
                { "username": "text", "hashtags": "text", "plainText": "text" }
            ],
            actions: [
                { "identityPublicKey": 1, "name": 1 },
                { "id": 1, "name": 1 },
            ],
            hashtags: [
                { "count": -1 }
            ],
            notifications: [
                { "identityPublicKey": 1 },
                { "updatedAt": 1 },
                { "postId": 1 }
            ],
            messages: [
                { "conversationId": 1 },
                { "createdAt": 1 },
                { "fromPublicKey": 1, "toPublicKey": 1 }
            ]
        }
    },
    bots: [
        'Baiduspider',
        'bingbot',
        'Discordbot',
        'Embedly',
        'facebookexternalhit',
        'Googlebot',
        'LinkedInBot',
        'outbrain',
        'pinterest',
        'quora link preview',
        'rogerbot',
        'redditbot',
        'showyoubot',
        'Slackbot',
        'TelegramBot',
        'Twitterbot',
        'vkShare',
        'W3C_Validator',
        'WhatsApp',
    ]
};

if (fs.existsSync(CONFIG_SECRET_JSON)) {
    const externalConfig = JSON.parse(fs.readFileSync(CONFIG_SECRET_JSON));

    const mergedObject = {};
    Object.assign(mergedObject, externalConfig.$private || {});
    Object.assign(mergedObject, externalConfig.$public || {});

    for (const key in mergedObject) {
        const indices = key.split('.');
        let obj = config;
        for (let i = 0; i < indices.length - 1; i++)
            obj = obj[indices[i]];
        obj[indices[indices.length - 1]] = mergedObject[key];
    }

    config.$private = Object.keys(externalConfig.$private || {});
}

export default config;