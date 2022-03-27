import BaseGatewayController from "./BaseGatewayController";
import ServerConfig from "../server.config";
import { v4 as uuidv4 } from 'uuid';

const TIME_SLIPPAGE = 5000;
const SEARCH_RETURN_LIMIT = 50;
const TRENDING_TAG_DAYS = 14; // trending tags over n days
//const MAX_FEED_DEPTH = 3;

class SearchGatewayController extends BaseGatewayController {
    get cursors() { return (this.state.cursors || (this.state.cursors = {})); }

    constructor(client) {
        super(client);
    }

    async disposeCursor({ cursorId }) {
        const cursor = this.cursors[cursorId];
        if (cursor) {
            cursor.close().catch(() => { }); // catch exception, but we don't care what happens...
            this.cursors[cursorId];
            return true;
        }
        return false;
    }

    async #consumeCursor(cursorId, limit, createAsync) {
        let cursor = null;
        if (cursorId) {
            cursor = this.cursors[cursorId];
            if (await cursor.isClosed()) {
                delete (this.cursors[cursorId]);
                cursor = null;
            }
        }
        else {
            cursorId = uuidv4();
            this.cursors[cursorId] = cursor = await createAsync();
        }

        const results = [];
        for (let i = 0; i < limit; i++) {

            if (!await cursor.hasNext()) {
                delete (this.cursors[cursorId]);
                cursorId = null;
                break;
            }

            const item = await cursor.next();
            results.push(await this.postProcessItem(item));
        }

        return { cursorId, results };
    }

    async searchAccounts({ username }) {
        if (!username) username = '';

        const { accounts } = await this.getDBO();
        const account = this.account;

        const pipeline = [
            {
                $match: {
                    username: {
                        $regex: `^${username}`,
                        $options: 'i'
                    }
                }
            },
            { $limit: 5 },
            ...projectAccountPipeline(account?.identityPublicKey)
        ];

        return await accounts.aggregate(pipeline).toArray();
    }

    async getSinglePost({ id,
        username, shortId, createdAt, // if [id] is not specified
        community,
        excludeProject }) {
        const moderatorPublicKeys = [];
        const { posts, communities } = await this.getDBO();

        if (!id) {
            // use community for moderator context
            if (community) {
                const dboCommunity = await communities.findOne({ name: community });
                if (dboCommunity) {
                    moderatorPublicKeys.push(dboCommunity.ownerPublicKey);
                    moderatorPublicKeys.push(...dboCommunity.moderators);
                }
            }

            // add self to the moderator list
            if (this.identityPublicKey && !moderatorPublicKeys.includes(this.identityPublicKey)) {
                moderatorPublicKeys.push(this.identityPublicKey);
            }
        }

        const cursor = await posts.aggregate([
            {
                $match: id ? { id } : {
                    username,
                    id: { $regex: `^${shortId}` },
                    createdAt: { $gte: (createdAt - TIME_SLIPPAGE), $lte: (createdAt + TIME_SLIPPAGE) }
                }
            },
            ...(excludeProject ? [] : projectPostPipeline(this.identityPublicKey, moderatorPublicKeys))
        ]);

        const result = await cursor.next();

        return result;
    }

    async getThread({ cursorId, username, shortId, createdAt }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const post = await this.getSinglePost({
                username, shortId, createdAt,
                excludeProject: true
            });

            if (!post) {
                return createEmptyCursor();
            }

            const account = this.account;
            const { posts } = await this.getDBO();

            const $match = {
                threadId: post.threadId
            };

            const pipeline = [
                { $match },
                ...sortPipeline('popular'),
                ...projectPostPipeline(account?.identityPublicKey)
            ];

            return await posts.aggregate(pipeline);
        });
    }

    async getUsersPosts({ cursorId, sort, usernames, topLevelOnly }) {
        if (!Array.isArray(usernames)) throw new Error(`Usernames was not specified or is not an array`);

        const identities = await this.resolveToIdentities(usernames);

        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { posts } = await this.getDBO();
            const account = this.account;
            const pipeline = [
                {
                    $match: {
                        identityPublicKey: { $in: identities },
                        parentId: topLevelOnly ? '' : { $ne: '' }
                    },
                },
                ...sortPipeline(sort),
                ...replyContextPipeline(account?.identityPublicKey),
                ...projectPostPipeline(account?.identityPublicKey)
            ];
            return await posts.aggregate(pipeline);
        });
    }

    async getHashtagPosts({ cursorId, sort, hashtags, threadOnly }) {
        if (!Array.isArray(hashtags)) throw new Error(`Hashtags was not specified or is not an array`);

        hashtags = hashtags.map(ht => ht.toLowerCase());

        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { posts } = await this.getDBO();
            const account = this.account;
            const pipeline = [
                {
                    $match: {
                        hashtags: { $in: hashtags },
                        parentId: threadOnly ? "" : { $exists: true }
                    },
                },
                ...sortPipeline(sort),
                ...projectPostPipeline(account?.identityPublicKey)
            ];
            return await posts.aggregate(pipeline);
        });
    }

    async getThreadContext({ id, threadId, indirectParentIds }) {
        if (!id) throw new Error(`3`);
        if (!threadId) throw new Error(`1`);
        if (!Array.isArray(indirectParentIds)) throw new Error(`2`);

        const context = {};
        let stack = new Set(indirectParentIds);

        const { posts } = await this.getDBO();

        while (stack.size > 0) {

            // TO-DO: walk cursor instead of toArray()
            const parents = await posts
                .find({ id: { $in: Array.from(stack) }, threadId })
                .toArray();

            // update the stack
            stack = new Set();
            for (const p of parents) {
                context[p.id] = p;
                if (p.parentId && p.parentId != id) {
                    stack.add(p.parentId);
                }
            }
        }

        return Object.values(context);
    }

    async getTrendingTags({ cursorId, limit }) {
        const timeLowerBound = Date.now() - (TRENDING_TAG_DAYS * 24 * 60 * 60 * 1000);
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { posts } = await this.getDBO();
            const pipeline = [
                { $match: { createdAt: { $gte: timeLowerBound } } },
                { $project: { "_id": 1, "hashtags": "$hashtags" } },
                { $unwind: "$hashtags" },
                { $group: { _id: "$hashtags", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                {
                    $lookup: {
                        from: ServerConfig.mongodb.collections.hashtags,
                        localField: "_id",
                        foreignField: "id",
                        as: "hashtagInfo"
                    }
                },
                //{ $unwind: "$hashtagInfo" },
                //{ $replaceRoot: { newRoot: "$hashtagInfo" } },
                {
                    $project: {
                        id: "$_id",
                        description: "",
                        logo: ""
                    }
                },
                { $limit: Math.max(Math.min(100, limit ?? 10), 1) }
            ];
            return await posts.aggregate(pipeline);
        });
    }

    async getExploreTags({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { hashtags } = await this.getDBO();
            const pipeline = [
                {
                    $sort: {
                        count: -1
                    }
                }
            ];
            return await hashtags.aggregate(pipeline);
        });
    }

    async getTextSearchPosts({ cursorId, q }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            if (!q) return createEmptyCursor();

            const usernames = q.match(/@[a-z0-9_]+/gi) ?? [];
            const hashtags = q.match(/#[a-z0-9_]+/gi) ?? [];
            const identities = (await this.resolveToIdentities(usernames.map(un => un.substring(1)), false, false)).filter(idpk => idpk);

            const $match = { $text: { $search: q } };

            if (hashtags.length > 0) {
                $match.hashtags = { $in: hashtags.map(ht => ht.substring(1)) };
            }

            if (identities.length > 0) {
                $match.$or = [
                    { identityPublicKey: { $in: identities } },
                    { mentions: { $in: identities } }
                ];
            }

            const identityPublicKey = this.identityPublicKey;
            const { posts } = await this.getDBO();
            const pipeline = [
                { $match },
                { $sort: { score: { $meta: "textScore" } } },
                ...projectPostPipeline(identityPublicKey)
            ];
            return await posts.aggregate(pipeline);
        });
    }

    async getIgnoredPosts({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            if (!identityPublicKey) return createEmptyCursor();

            const { posts } = await this.getDBO();
            const pipeline = [
                {
                    $match: {
                        ignoredBy: { $in: [identityPublicKey] }
                    }
                },
                ...projectPostPipeline(identityPublicKey)
            ];

            return await posts.aggregate(pipeline);
        });
    }

    async getOwnedCommunities({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            if (!identityPublicKey) return createEmptyCursor();

            const { communities } = await this.getDBO();

            const pipeline = [
                {
                    $match: {
                        ownerPublicKey: identityPublicKey
                    }
                }
            ];

            return await communities.aggregate(pipeline);
        });
    }

    async getCommunityInfo({ name }) {
        const { communities } = await this.getDBO();

        const identityPublicKey = this.identityPublicKey;
        const pipeline = [
            { $match: { name: name.toLowerCase() } },
            ...projectCommunityPipeline(identityPublicKey),
            { $limit: 1 }
        ];

        const cursor = await communities.aggregate(pipeline);
        const result = await cursor.next();
        return result;
    }

    async getCommunityPosts({ cursorId, sort, name }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { posts, communities } = await this.getDBO();
            const community = await communities.findOne({ name: name.toLowerCase() });
            if (!community) return createEmptyCursor();

            const identityPublicKey = this.identityPublicKey;
            const moderatorPublicKeys = [community.ownerPublicKey];

            if (identityPublicKey) moderatorPublicKeys.push(identityPublicKey);
            if (community.moderators) moderatorPublicKeys.push(...community.moderators);

            const pipeline = [
                {
                    $match: {
                        ...matchInCommunity(community)
                    }
                },
                ...sortPipeline(sort),
                ...projectPostPipeline(identityPublicKey, moderatorPublicKeys)
            ];

            return await posts.aggregate(pipeline);
        });
    }

    async getFeedPosts({ cursorId, sort, accountFilter }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {

            // search for top level
            let $match = {
                parentId: ""
            };

            const { posts, account, communities } = await this.getDBO({ account: this.account ? true : false });

            if (account) {
                if (accountFilter) {

                    //
                    // this users personal feed
                    // - do not return any posts from people that have been blocked
                    // - return posts from yourself
                    // - return posts from people you follow
                    // - return posts that have not been moderated in communities you are subscribed to
                    //

                    const myCommunities = await communities
                        .find(
                            { subscribers: account.identityPublicKey },
                            { subscribers: 0 }) // redact subscribers field, don't need it
                        .toArray();

                    $match = {
                        $and: [
                            {
                                identityPublicKey: { $nin: account.blocked ?? [] }
                            },
                            {
                                $or: [
                                    {
                                        ...$match,
                                        identityPublicKey: { $in: [account.identityPublicKey, ...(account.following ?? [])] }
                                    },
                                    ...myCommunities.map(c => matchInCommunity(c, true))
                                ]
                            }
                        ]
                    }
                }
                else if (account.blocked) {

                    // 
                    // since account filter isn't true, this user is trying to explore new/popular content
                    // - do not return any posts from people that have been blocked
                    //

                    $match = {
                        ...$match,
                        identityPublicKey: { $nin: account.blocked }
                    };
                }
            }

            const pipeline = [
                { $match },
                ...sortPipeline(sort),
                /*{
                    $lookup: {
                        from: ServerConfig.mongodb.collections.posts,
                        let: {
                            threadId: "$threadId",
                            minDepth: { $add: ["$depth", 1] },
                            maxDepth: { $add: ["$depth", MAX_FEED_DEPTH] }
                        },
                        pipeline: [
                            {
                                //
                                // find posts in the same thread, but we want those posts
                                // to be >= current depth
                                // but also <= current depth + MAX_FEED_DEPTH
                                //
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$threadId", "$$threadId"] },
                                            { $gte: ["$depth", "$$minDepth"] },
                                            { $lte: ["$depth", "$$maxDepth"] }
                                        ]
                                    }
                                },
                            },
                            ...sortPipeline(sort)
                        ],
                        as: "thread"
                    }
                },*/
                ...projectPostPipeline(account?.identityPublicKey)
            ];
            return await posts.aggregate(pipeline, {
                allowDiskUse:true
               });
        });
    }

    async getBlocked({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {

            const { accounts, account } = await this.getDBO({ account: true });
            if (!account.blocked) return createEmptyCursor();

            const pipeline = [
                { $match: { identityPublicKey: { $in: account.blocked } } },
                ...projectAccountPipeline(this.identityPublicKey)
            ];

            return await accounts.aggregate(pipeline);
        });
    }

    async getFollow({ username, cursorId, following }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const [identityPublicKey] = await this.resolveToIdentities([username]);
            if (!identityPublicKey) return createEmptyCursor();

            const { accounts } = await this.getDBO();
            const account = await accounts.findOne({ identityPublicKey });

            if (following && !account?.following) return createEmptyCursor();
            if (!following && !account?.followers) return createEmptyCursor();

            const idpks = (following ? account.following : account.followers) ?? [];
            const pipeline = [
                { $match: { identityPublicKey: { $in: idpks } } },
                ...projectAccountPipeline(this.identityPublicKey)
            ];

            return await accounts.aggregate(pipeline);
        });
    }

    async getPopularCommunities({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            const { communities } = await this.getDBO();
            const pipeline = [
                {
                    $addFields: {
                        subscriberCount: { $size: "$subscribers" }
                    }
                },
                { // some minimum threshold...
                    $match: {
                        subscriberCount: { $gte: 0 },
                    }
                },
                ...projectCommunityPipeline(identityPublicKey),
                {
                    $sort: {
                        isSubscribed: -1,
                        subscriberCount: -1
                    }
                }
            ];

            return await communities.aggregate(pipeline);
        });
    }

    async getSingleProposal({ username, expires }) {
        const { proposals } = await this.getDBO();
        //console.log(`Searching proposal`, username, expires);

        return await proposals.findOne({
            username,
            expires: parseInt(expires)
        });
    }

    async getProposals({ cursorId, history }) {

        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const { proposals } = await this.getDBO();

            const pipeline = [
                {
                    $match: {
                        expires: history ? { $lte: Date.now() } : { $gte: Date.now() }
                    }
                }
            ];

            return await proposals.aggregate(pipeline);
        });
    }

    async getPopularUsers({ cursorId }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            const { accounts } = await this.getDBO();
            const pipeline = [
                {
                    $addFields: {
                        followersCount: { $size: "$followers" }
                    }
                },
                {
                    $match: {
                        identityPublicKey: { $ne: identityPublicKey },
                        followersCount: { $gte: 3 },
                    }
                },
                {
                    $sort: {
                        followersCount: -1,
                    }
                },
                ...projectAccountPipeline(identityPublicKey),
                {
                    $match: {
                        isFollowing: false
                    }
                }
            ];

            return await accounts.aggregate(pipeline);
        });
    }

    async getFollowReccomendations({ cursorId, limit }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            if (!identityPublicKey) return createEmptyCursor();

            const { oauths, account } = await this.getDBO({ account: true });

            const oauth = await oauths.find({ activeIdentityPublicKey: identityPublicKey }).toArray();

            let discordGuilds = [];
            const discordOAuth = oauth.find(oa => oa.provider == 'discord');
            if (discordOAuth) {
                discordGuilds = discordOAuth.profile.guilds.map(g => g.id);
            }

            let redditSubs = [];
            const redditOAuth = oauth.find(oa => oa.provider == 'reddit');
            if (redditOAuth) {
                redditSubs = redditOAuth.profile.subreddits ?? [];
            }

            const pipeline = [
                {
                    $match: {
                        activeIdentityPublicKey: { $exists: true, $nin: [identityPublicKey, ...(account.following ?? [])] },
                        $or: [
                            {
                                provider: 'discord',
                                "profile.guilds.id": { $in: discordGuilds }
                            },
                            {
                                provider: 'reddit',
                                $expr: {
                                    $gte: [{ $size: { $setIntersection: ["$profile.subreddits", redditSubs] } }, 3]
                                }
                            }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: ServerConfig.mongodb.collections.accounts,
                        let: { activeIdentityPublicKey: "$activeIdentityPublicKey" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$identityPublicKey", "$$activeIdentityPublicKey"]
                                    }
                                }
                            },
                            ...projectAccountPipeline(identityPublicKey)
                        ],
                        as: "activeAccount"
                    }
                },
                { $unwind: "$activeAccount" },
                { $replaceRoot: { newRoot: "$activeAccount" } }
            ];

            if (limit) {
                pipeline.push({ $limit: limit });
            }

            return await oauths.aggregate(pipeline);
        });
    }

    async getNotifications({ cursorId, limit }) {
        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {
            const identityPublicKey = this.identityPublicKey;
            if (!identityPublicKey) return createEmptyCursor();

            const { notifications, accounts } = await this.getDBO();

            await accounts.updateOne({ identityPublicKey }, {
                $set: {
                    lastCheckedNotifications: Date.now()
                }
            });

            const pipeline = [
                { $match: { identityPublicKey } },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: ServerConfig.mongodb.collections.posts,
                        let: { postId: "$postId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$id", "$$postId"]
                                    }
                                }
                            },
                            ...projectPostPipeline(identityPublicKey)
                        ],
                        as: "post"
                    }
                },
                { $addFields: { post: { $arrayElemAt: ["$post", 0] } } }
            ];

            if (limit && !isNaN(limit)) {
                pipeline.push({ $limit: limit });
            }

            return await notifications.aggregate(pipeline);
        });
    }

    async hasUnreadMessages() {
        const identityPublicKey = this.identityPublicKey;
        if (!identityPublicKey) return false;

        const { account, messages } = await this.getDBO({ account: true });

        const lastCheckedMessages = account.lastCheckedMessages ?? 0;

        const msg = await messages
            .findOne({
                $or: [{ fromPublicKey: identityPublicKey }, { toPublicKey: identityPublicKey }],
                createdAt: { $gt: lastCheckedMessages }
            });

        return msg ? true : false;
    }

    async getNotificationCount({ likeNotifications }) {
        const identityPublicKey = this.identityPublicKey;
        if (!identityPublicKey) return 0;

        const { account, notifications } = await this.getDBO({ account: true });

        const lastCheckedNotifications = account.lastCheckedNotifications ?? 0;

        const filter = {
            identityPublicKey,
            updatedAt: { $gt: lastCheckedNotifications }
        };

        if (!likeNotifications) {
            filter.type = { $ne: "like" };
        }

        return notifications
            .find(filter)
            .limit(99)
            .count();
    }

    async getActiveChats({ cursorId, fromPublicKey, limit }) {
        this.requireIdentity(fromPublicKey);

        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {

            const { messages } = await this.getDBO();

            const pipeline = [
                { $match: { $or: [{ fromPublicKey }, { toPublicKey: fromPublicKey }] } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$conversationId",
                        createdAt: { $first: "$createdAt" },
                        nonce: { $first: "$nonce" },
                        message: { $first: "$message" },
                        checksum: { $first: "$checksum" },
                        toPublicKey: { $first: "$toPublicKey" },
                        fromPublicKey: { $first: "$fromPublicKey" }
                    }
                },
                {
                    $lookup: {
                        from: ServerConfig.mongodb.collections.accounts,
                        let: {
                            contactPublicKey: {
                                $cond: {
                                    if: { $eq: ["$fromPublicKey", fromPublicKey] },
                                    then: "$toPublicKey",
                                    else: "$fromPublicKey"
                                }
                            }
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$identityPublicKey", "$$contactPublicKey"]
                                    }
                                }
                            },
                            ...projectAccountPipeline(fromPublicKey)
                        ],
                        as: "contactInfo"
                    }
                },
                { $addFields: { contactInfo: { $arrayElemAt: ["$contactInfo", 0] } } },
                { $sort: { createdAt: -1 } }
            ];

            if (limit && !isNaN(limit)) {
                pipeline.push({ $limit: limit });
            }

            return await messages.aggregate(pipeline);
        });
    }

    async getDirectMessages({ cursorId, fromPublicKey, toPublicKey }) {
        this.requireIdentity(fromPublicKey);
        this.validatePublicKey(toPublicKey);

        return await this.#consumeCursor(cursorId, SEARCH_RETURN_LIMIT, async () => {

            const { messages } = await this.getDBO();

            const conversationId = [fromPublicKey, toPublicKey].sort().join(' ');

            const pipeline = [
                { $match: { conversationId } },
                { $sort: { createdAt: -1 } }
            ];

            return await messages.aggregate(pipeline);
        });
    }

    async getUserInfo({ username, identityPublicKey }) {
        if (!identityPublicKey && username) {
            const [idpk] = await this.resolveToIdentities([username]);
            identityPublicKey = idpk;
        }
        else if (!identityPublicKey && this.account) {
            identityPublicKey = this.account.identityPublicKey;
        }

        if (!identityPublicKey) return null;

        const { accounts } = await this.getDBO();

        const pipeline = [
            { $match: { identityPublicKey } },
            ...projectAccountPipeline(this.identityPublicKey)
        ];

        const cursor = await accounts.aggregate(pipeline);

        return await this.postProcessItem(await cursor.next());
    }

    async postProcessItem(item) {
        //
        // ignore the username field thats in the database, update it based off of 
        // what we have recorded in the RAM map from idpk -> username
        // this is to deal with future cases of importing usernames from an external source
        // i.e. a blockchain but then end up having a local conflict
        //

        if (item.identityPublicKey) {
            const [username] = await this.resolveToUsernames([item.identityPublicKey]);
            item.username = username;
        }

        if (item.relatedIdentities) {
            const relatedUsernames = await this.resolveToUsernames(item.relatedIdentities);
            item.relatedUsernames = relatedUsernames;
        }

        if (item.hideOAuths) {
            const selfIdentityPublicKey = this.identityPublicKey;
            if (item.identityPublicKey != selfIdentityPublicKey && Array.isArray(item.oauth)) {
                item.oauth = item.oauth.filter(({ provider }) => !item.hideOAuths.some(p => p == provider));
            }
        }

        return item;
    }
}

function createEmptyCursor() {
    return {
        async hasNext() {
            return false;
        }
    }
}

function replyContextPipeline(identityPublicKey) {
    return [
        {
            $lookup: {
                from: ServerConfig.mongodb.collections.posts,
                let: {
                    threadId: "$threadId",
                    parentId: "$parentId",
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ["$id", "$$threadId"] },
                                    { $eq: ["$id", "$$parentId"] },
                                ]
                            }
                        }
                    },
                    ...projectPostPipeline(identityPublicKey)
                ],
                as: "replyContext"
            }
        },
    ];
}

function matchInCommunity(community, modFilter = false) {
    const compiledFilter = JSON.parse(community.compiledFilter);
    const $match = {
        parentId: "",
        $or: [
            { community: community.name },
            { hashtags: community.name },
            { ...compiledFilter }
        ]
    };

    if (!modFilter) return $match;

    const moderators = [community.ownerPublicKey, ...community.moderators];
    return {
        $and: [
            $match,
            { ignoredBy: { $nin: moderators } },
        ]
    }
}

function projectCommunityPipeline(identityPublicKey) {
    const pipeline = [
        {
            $addFields: {
                isSubscribed: identityPublicKey ? { $in: [identityPublicKey, { $ifNull: ["$subscribers", []] }] } : { $literal: false },
            },
        },
        {
            $unset: ["subscribers"]
        }
    ];

    return pipeline;
}

function projectPostPipeline(identityPublicKey, moderatorPublicKeys) {
    if (!moderatorPublicKeys && identityPublicKey) {
        moderatorPublicKeys = [identityPublicKey];
    }

    moderatorPublicKeys = Array.from(new Set([...(moderatorPublicKeys ?? []), ...ServerConfig.globalModerators]));

    const pipeline = [
        {
            $addFields: {
                totalLikes: { $size: "$likes" },
                ignoredBy: moderatorPublicKeys ? { $setIntersection: [moderatorPublicKeys, { $ifNull: ["$ignoredBy", []] }] } : { $literal: [] },
                flaggedNsfwBy: moderatorPublicKeys ? { $setIntersection: [moderatorPublicKeys, { $ifNull: ["$flaggedNsfwBy", []] }] } : { $literal: [] }
            }
        },
        {
            $unset: ["likes"]
        }
    ];

    if (identityPublicKey) {
        pipeline[0].$addFields.isLiked = { $in: [identityPublicKey, "$likes"] };
    }

    return pipeline;
}

function projectAccountPipeline(identityPublicKey) {
    const pipeline = [
        {
            $project: {
                identityPublicKey: "$identityPublicKey",
                walletPublicKey: "$walletPublicKey",
                username: "$username",
                avatar: "$avatar",
                createdAt: "$createdAt",
                following: { $size: { $ifNull: ["$following", []] } },
                followers: { $size: { $ifNull: ["$followers", []] } },
                blocked: {
                    $cond: {
                        if: { $eq: [identityPublicKey, "$identityPublicKey"] },
                        then: "$blocked",
                        else: { $literal: [] }
                    }
                },
                biography: "$biography",
                hideOAuths: "$hideOAuths",
                isFollowing: identityPublicKey ? { $in: [identityPublicKey, { $ifNull: ["$followers", []] }] } : { $literal: false },
                isBlocked: identityPublicKey ? { $in: [identityPublicKey, { $ifNull: ["$blockedBy", []] }] } : { $literal: false }
            }
        },
        {
            $lookup: {
                from: ServerConfig.mongodb.collections.oauths,
                let: {
                    identityPublicKey: "$identityPublicKey"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$activeIdentityPublicKey", "$$identityPublicKey"]
                            }
                        }
                    },
                    {
                        $project: {
                            id: "$id",
                            provider: "$provider",
                            username: "$username"
                        }
                    }
                ],
                as: "oauth"
            }
        }
    ];
    return pipeline;
}

function sortPipeline(sort) {
    sort = sort.toLowerCase();

    if (sort == 'recent') {
        return [
            {
                $sort: {
                    pinned: -1,
                    createdAt: -1
                }
            }
        ];
    }
    else if (sort == 'popular') {
        const G = 1.8;
        const now = Date.now();
        return [
            {
                $addFields: {
                    //
                    // T=time since post in hrs, higher G = time brings score down faster
                    //
                    // score = (likes+totalReplies)/(T+2)^G
                    //
                    score: {
                        $divide: [
                            { $add: [{ $size: "$likes" }, "$totalReplies"] },
                            {
                                $pow: [
                                    { $add: [{ $divide: [{ $subtract: [now, "$createdAt"] }, 3600] }, 2] },
                                    G
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $sort: {
                    pinned: -1,
                    score: -1
                }
            }
        ];
    }

    return [];
}

export default SearchGatewayController;