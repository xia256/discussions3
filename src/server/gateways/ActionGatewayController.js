import BaseGatewayController from "./BaseGatewayController";
//import Account from "./Account";
import { KeyManager } from "../../KeyManager";
import { CommunityObject, PostObject } from "../api/objects";
import { tryParseJson } from "../../utility";
import { updateUserIdentity } from "../mongodb";

import GatewayServer from "../gateways/GatewayServer";

import ServerConfig from "../server.config";
import ecc from 'eosjs-ecc';
import { Api, JsonRpc } from "eosjs";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import fetch from "node-fetch";

import {
    mentionRegex,
    parseDocument,
    getActionCommitment
} from "../../utility";
import CryptoGatewayController from "./CryptoGatewayController";

class ActionGatewayController extends BaseGatewayController {
    constructor(client) {
        super(client);
    }

    async #commitAction($match, $set, options = {}) {
        options = Object.assign({
            checkAuthority: true,
            checkNonce: true
        }, options);

        const $action = { ...$set, ...$match };
        const { nonce, signature, identityPublicKey } = $action;

        if (isNaN(nonce))
            throw new Error(`Nonce must be a number`);

        if (!KeyManager.verifyText(signature, await getActionCommitment($action), identityPublicKey))
            throw new Error(`Invalid action signature`);

        const { actions } = await this.getDBO();

        const existing = await actions.findOne($match);
        if (existing) {
            if (options.checkNonce && existing.nonce >= nonce) {
                throw new Error(`Invalid nonce`);
            }
            if (options.checkAuthority && existing.identityPublicKey != identityPublicKey) {
                throw new Error(`Invalid identity authorization`);
            }
        }

        await actions.updateOne($match,
            {
                $setOnInsert: $match,
                $set: $set
            },
            { upsert: true }
        );

        return {
            existed: existing ? true : false
        }
    }

    async #updateNotification($match, $update = {}) {
        const { $set, ...rest } = $update;
        const { notifications } = await this.getDBO();

        return await notifications.updateOne($match,
            {
                $setOnInsert: {
                    ...$match,
                    createdAt: Date.now()
                },
                $set: {
                    ...($set ?? {}),
                    updatedAt: Date.now()
                },
                ...rest
            },
            { upsert: true }
        )
    }

    async flagNsfwPost({ identityPublicKey, postId, value, nonce, signature }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(postId);

        const { posts } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'nsfw-post', postId, identityPublicKey },
                { value, nonce, signature });

            if (value) { // flag 
                await posts.updateOne(
                    { id: postId },
                    { $addToSet: { flaggedNsfwBy: identityPublicKey } });
            }
            else {
                await posts.updateOne(
                    { id: postId },
                    { $pull: { flaggedNsfwBy: identityPublicKey } });
            }

            return value;
        });
    }

    async voteProposal({ identityPublicKey, postId, expires, type }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(postId);

        if (type != 'support' && type != 'against' && type != 'abstain')
            throw new Error(`Invalid support type: ${type}`);

        const { account, proposals } = await this.getDBO({ account: true });
        const walletPublicKey = account.walletPublicKey;

        // remove an existing vote
        await proposals.updateOne({ postId, expires }, {
            $pull: {
                support: walletPublicKey,
                abstain: walletPublicKey,
                against: walletPublicKey
            }
        });

        // re-push the vote
        await proposals.updateOne({ postId, expires }, {
            $push: {
                [type]: walletPublicKey
            }
        });

        return true;
    }

    async submitProposal({ identityPublicKey, postId, title }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(postId);
        if (!title || title.length < 5) throw new Error(`Title is too short`);
        if (title.length > 64) throw new Error(`Title is too long`);

        const { proposals, account } = await this.getDBO({ account: true });
        console.log(account.walletPublicKey);

        const signatureProvider = new JsSignatureProvider([]);
        const api = new Api({
            rpc: new JsonRpc(ServerConfig.crypto.eos.rpc, { fetch }),
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });

        const bound = `0x${ecc.sha256(ecc.PublicKey.fromString(account.walletPublicKey).toBuffer(), 'hex')}`;
        const stakeAccounts = await api.rpc.get_table_rows({
            json: true,
            code: `atmosstakev2`,
            scope: '3,ATMOS',
            table: 'accounts',
            limit: 100,
            key_type: 'i256',
            lower_bound: bound,
            upper_bound: bound,
            index_position: 2,
        });

        const weight = (stakeAccounts?.rows?.length > 0) ? parseInt(stakeAccounts.rows[0].total_weight) : 0;
        const MIN_WEIGHT = 52559900; // 1000 ATMOS @ 1y
        if (weight < MIN_WEIGHT)
            throw new Error(`You need to have a staking weight of at least 52559900 (i.e. 1000 ATMOS for 1 year)`);

        return await this.lockAccount(async () => {

            const count = await proposals
                .find({ identityPublicKey, expires: { $gte: Date.now() } })
                .count();

            const MAX_PROPOSALS = 3;
            if (count >= MAX_PROPOSALS)
                throw new Error(`You may only have a maximum of ${MAX_PROPOSALS} active proposals`);

            await proposals.insertOne({
                identityPublicKey,
                username: account.username,
                postId,
                title,
                expires: Date.now() + (14 * 24 * 60 * 60 * 1000), // 2 weeks
                support: [account.walletPublicKey],
                against: [],
                abstain: []
            });

            return true;
        });
    }

    async ignorePost({ identityPublicKey, postId, value, nonce, signature }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(postId);

        const { posts } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'ignore-post', postId, identityPublicKey },
                { value, nonce, signature });

            if (value) { // ignore 
                await posts.updateOne(
                    { id: postId },
                    { $addToSet: { ignoredBy: identityPublicKey } });
            }
            else {
                await posts.updateOne(
                    { id: postId },
                    { $pull: { ignoredBy: identityPublicKey } });
            }

            return value;
        });
    }

    async blockUser({ identityPublicKey, blockPublicKey, value, nonce, signature }) {
        this.requireIdentity(identityPublicKey);
        this.requireNotSelf(blockPublicKey);

        const { accounts } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'block', blockPublicKey, identityPublicKey },
                { value, nonce, signature });

            if (value) { // block 
                await accounts.updateOne(
                    { identityPublicKey },
                    { $addToSet: { blocked: blockPublicKey } });

                await accounts.updateOne(
                    { identityPublicKey: blockPublicKey },
                    { $addToSet: { blockedBy: identityPublicKey } });
            }
            else {
                await accounts.updateOne(
                    { identityPublicKey },
                    { $pull: { blocked: blockPublicKey } }
                );

                await accounts.updateOne(
                    { identityPublicKey: blockPublicKey },
                    { $pull: { blockedBy: identityPublicKey } });
            }

            return value;
        });
    }

    async followUser({ identityPublicKey, followPublicKey, value, nonce, signature }) {
        this.requireIdentity(identityPublicKey);
        this.requireNotSelf(followPublicKey);

        const { accounts } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'follow', followPublicKey, identityPublicKey },
                { value, nonce, signature });

            if (value) { // follow 
                await accounts.updateOne(
                    { identityPublicKey },
                    { $addToSet: { following: followPublicKey } }
                );

                await accounts.updateOne(
                    { identityPublicKey: followPublicKey },
                    { $addToSet: { followers: identityPublicKey } });

                // follow notification
                await this.#updateNotification({
                    identityPublicKey: followPublicKey,
                    type: 'follow'
                },
                    {
                        $addToSet: {
                            relatedIdentities: identityPublicKey
                        }
                    });
            }
            else { // unfollow
                await accounts.updateOne(
                    { identityPublicKey },
                    { $pull: { following: followPublicKey } }
                );

                await accounts.updateOne(
                    { identityPublicKey: followPublicKey },
                    { $pull: { followers: identityPublicKey } });
            }

            return value;
        });
    }

    async likePost({ identityPublicKey, postId, value, nonce, signature }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(postId);

        const { posts } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'like', postId, identityPublicKey },
                { value, nonce, signature });

            const update = value ?
                { $addToSet: { likes: this.account.identityPublicKey } } :
                { $pull: { likes: this.account.identityPublicKey } };

            const { ok, value: post } = await posts.findOneAndUpdate({ id: postId }, update);

            if (ok && post) {
                // NOTE: consider, should you get a notification if a post you were mentioned in was liked?
                // twitter does this...

                // like notification
                await this.#updateNotification({
                    identityPublicKey: post.identityPublicKey,
                    type: 'like',
                    postId: post.id
                },
                    {
                        $addToSet: {
                            relatedIdentities: identityPublicKey
                        }
                    });

                for (const client of this.getClientsByIdentities([post.identityPublicKey])) {
                    client.push('checkNotifications');
                }
            }
            return value;
        });
    }

    async getIdentities({ usernames }) {
        // we explicitly pass tryUpdate=false to lower cost
        return await super.resolveToIdentities(usernames, false, true);
    }

    async pinPost({ id, identityPublicKey, pinned }) {
        this.requireIdentity(identityPublicKey);

        const { posts } = await this.getDBO();
        if (!this.isGlobalModerator(identityPublicKey)) {
            throw new Error(`Must be a global moderator to pin a post`);
        }

        if (pinned) {
            await posts.updateOne({ id }, {
                $set: {
                    pinned: pinned
                }
            });
        }
        else {
            await posts.updateOne({ id }, {
                $unset: {
                    pinned: ""
                }
            });
        }

        return true;
    }

    async createPost({ id, identityPublicKey, signature, content, parentId, threadId, community, hashtags, mentions, nonce, transfers }) {
        this.requireIdentity(identityPublicKey);
        this.validateUUID(id);
        this.validateUUID(threadId);
        this.validateUUID(parentId, (id == threadId) ? true : false); // we expect null if id==threadId
        this.validateArray(hashtags, 'hashtags', true, ht => ht.match(new RegExp(mentionRegex)));
        this.validateArray(mentions, 'mentions', true, idpk => KeyManager.isValidPublic(idpk));

        if (!content) throw new Error(`There's no content to post!`);
        else if (content.length > 40000) throw new Error(`Content exceeds max length`);

        const document = parseDocument(content);
        const textContent = document.body.textContent;
        if (!textContent || textContent.length < 3) {
            if (!document.querySelector('img')) // if it contains an image, we can ignore the text requirement
                throw new Error(`Content is too short`);
        }
        else if (textContent.length > 20000) throw new Error(`Text content exceeds max length`);

        const { posts, account, accounts } = await this.getDBO({ account: true })
        const post = new PostObject();
        const now = Date.now();
        let isEdit = false;

        const dboPost = await this.lock(async () => {

            if (transfers && Object.keys(transfers).length > 0) {
                const crypto = new CryptoGatewayController(this.client);
                for (const chain of Object.keys(transfers)) {
                    const trx = await crypto.transfer({ chain, actions: transfers[chain] });
                    trx;
                }
            }

            const { existed: _isEdit } = await this.#commitAction(
                { name: 'post', id },
                { identityPublicKey, content, parentId, threadId, community, hashtags, mentions, signature, nonce, transfers });

            isEdit = _isEdit;

            post.content = content;
            post.identityPublicKey = identityPublicKey;
            post.signature = signature;
            post.mentions = Array.from(new Set([identityPublicKey, ...mentions]));
            post.hashtags = Array.from(new Set(hashtags.map(ht => ht.toLowerCase()))); // TO-DO: limit hashtags?
            post.avatar = account.avatar;
            post.username = account.username;
            post.createdAt = new Date(now);
            post.updatedAt = new Date(now);
            post.likes = [account.identityPublicKey];
            post.id = id;

            if (threadId) {
                post.threadId = threadId;
                post.parentId = (id == threadId) ? '' : parentId;
            }
            else {
                post.threadId = id; // self
                post.parentId = '';
            }

            post.parentId = parentId ?? post.parentId;
            post.threadId = threadId ?? post.threadId;
            post.community = (community ?? '').toLowerCase();

            if (post.parentId) {

                if (!isEdit) {
                    const { ok, value: parent } = await posts.findOneAndUpdate({ id: post.parentId },
                        {
                            $inc: { totalReplies: 1 },
                            $set: { threadUpdatedAt: now }
                        });

                    // the OP of a thread will show all comments counted as total replies
                    if (post.threadId != post.parentId) {
                        await posts.updateOne({ id: post.threadId },
                            {

                                $inc: { totalReplies: 1 },
                            });
                    }

                    if (ok && parent) {
                        post.community = parent.community; // must be in the same community as parent
                        post.depth = parent.depth + 1;
                        // add implicit mention from replying
                        post.mentions = Array.from(new Set([...post.mentions, parent.identityPublicKey]));
                    }

                }

                await posts.updateOne(
                    { id: post.threadId },
                    { $set: { threadUpdatedAt: now } });
            }

            const postDbo = post.toDBO();
            if (isEdit) {
                delete (postDbo.likes);
            }

            const { value: dboPost } = await posts.findOneAndUpdate(
                { id },
                {
                    $setOnInsert: {
                        createdAt: now,
                    },
                    $set: {
                        ...postDbo,
                        threadUpdatedAt: now
                    }
                },
                {
                    upsert: true,
                    returnOriginal: false
                });

            return dboPost;
        });

        if (!isEdit) {
            if (post.mentions.length > 0) {
                // mention notifications
                for (const idpk of post.mentions) {
                    if (idpk == identityPublicKey) continue;

                    await this.#updateNotification({
                        identityPublicKey: idpk,
                        type: 'mention',
                        postId: post.id
                    },
                        {
                            $addToSet: {
                                relatedIdentities: post.identityPublicKey
                            }
                        });
                }

                for (const client of this.getClientsByIdentities(post.mentions)) {
                    client.push('checkNotifications');
                }
            }

            if (post.hashtags.length > 0) {
                // update account stats
                await accounts.updateOne({ identityPublicKey },
                    {
                        $inc: {
                            'stats.posts': 1,
                            'stats.threads': (parentId) ? 0 : 1,
                            'stats.replies': (parentId) ? 1 : 0,
                            ...post.hashtags.reduce((o, ht) => (o[`stats.hashtags.${ht}`] = 1) && o, {})
                        }
                    });
            }
        }

        return dboPost;
    }

    async sendDirectMessage({ nonce, message, checksum, toPublicKey, fromPublicKey }) {
        this.requireIdentity(fromPublicKey);
        this.validatePublicKey(toPublicKey);

        if (!message) throw new Error(`Message is empty`);
        if (message.length > 8000) throw new Error(`Message exceeds the max length`);

        const { messages } = await this.getDBO();
        const createdAt = Date.now();
        const conversationId = [fromPublicKey, toPublicKey].sort().join(' ');

        await messages.insertOne({
            conversationId,
            createdAt,
            nonce,
            message,
            checksum,
            toPublicKey,
            fromPublicKey
        });

        const clients = GatewayServer.getClientsByIdentities([fromPublicKey, toPublicKey]);
        for (const client of clients) {
            client.push('directMessage', { createdAt, nonce, message, checksum, toPublicKey, fromPublicKey });
        }

        return true;
    }

    // TO-DO: should we require a commitment here? maybe in the future...
    async updateProfile({ identityPublicKey, biography, hideOAuths }) {
        this.requireIdentity(identityPublicKey);

        if (biography && biography.length > 160) throw new Error(`Biography is too long!`);

        const { accounts } = await this.getDBO();

        await accounts.updateOne({ identityPublicKey }, {
            $set: {
                biography: biography ?? '',
                hideOAuths: hideOAuths
            }
        });

        return true;
    }

    async oauthLink({ identityPublicKey, nonce, oauth, signature }) {
        this.requireIdentity(identityPublicKey);

        if (!KeyManager.verifyText(signature, await getActionCommitment({ name: "oauth-link", nonce, oauth }), identityPublicKey))
            throw new Error(`Could not verify oauth authorization`);

        const stateOAuth = this.state.oauth;
        if (oauth && stateOAuth &&
            oauth.id == stateOAuth.id &&
            oauth.provider == stateOAuth.provider) {

            const { oauths } = await this.getDBO();

            // add to oauths accounts
            await oauths.updateOne(
                {
                    provider: oauth.provider,
                    id: oauth.id,
                    "accounts.identityPublicKey": { $ne: identityPublicKey },
                },
                {
                    $set: {
                        activeIdentityPublicKey: identityPublicKey
                    },
                    $push: {
                        accounts: { identityPublicKey, proof: signature }
                    }
                }
            );

            // update activeIdentityPublicKey
            await oauths.updateOne(
                {
                    provider: oauth.provider,
                    id: oauth.id,
                },
                {
                    $set: {
                        activeIdentityPublicKey: identityPublicKey
                    },
                });

            return oauth;
        }

        return null;
    }

    async joinLeaveCommunity({ identityPublicKey, community, nonce, value, signature }) {
        // join: value=true
        // leave: value=false

        this.requireIdentity(identityPublicKey);

        const { communities } = await this.getDBO();

        return await this.lockAccount(async () => {
            await this.#commitAction(
                { name: 'jl-community', identityPublicKey, community },
                { value, nonce, signature });

            if (value) { // join
                await communities.updateOne(
                    { name: community.toLowerCase() },
                    { $addToSet: { subscribers: identityPublicKey } }
                );
            }
            else { // leave
                await communities.updateOne(
                    { name: community.toLowerCase() },
                    { $pull: { subscribers: identityPublicKey } }
                );
            }

            return value;
        });
    }

    async abdictateCommunity({
        identityPublicKey,
        ownerPublicKey,
        community,
        nonce,
        signature
    }) {
        // TO-DO: ...
        return { identityPublicKey, ownerPublicKey, community, nonce, signature };
    }

    async createCommunity({
        identityPublicKey,
        community,
        filter,
        moderators,
        description,
        nonce,
        signature,
    }) {
        this.requireIdentity(identityPublicKey);
        this.validateArray(moderators, 'moderators', true, idpk => KeyManager.isValidPublic(idpk));

        if (!community || !community.match(/^[a-z0-9_]*$/)) throw new Error(`Community name must only contain lowercase, numbers or underscores`);
        if (community.length < 3 || community.length > 16) throw new Error(`Community name is an invalid length`);
        if (!description) throw new Error(`Description cannot be blank`);
        if (description.length > 8000) throw new Error(`Description exceeds the max length`);

        const resolveToIdentities = (usernames) => this.resolveToIdentities(usernames);
        const compiledFilter = await (async function resolve(obj) {
            if (typeof obj == 'string') return obj;
            for (const key of Object.keys(obj)) {
                if (key == 'identityPublicKey') {
                    const value = obj[key];
                    const [idpk] = await resolveToIdentities([value]);
                    obj[key] = idpk;
                }
                else await resolve(obj[key]);
            }
            return obj;
        })(CommunityObject.compileFilter(filter).query);

        return await this.lock(async () => {

            const { communities } = await this.getDBO();
            const existingCommunity = await communities.findOne({ name: community });

            if (existingCommunity && existingCommunity.ownerPublicKey != identityPublicKey) {
                throw new Error(`You do not have ownership of this community`);
            }

            // authority is checked above against ownerPublicKey
            await this.#commitAction(
                { name: 'create-community', community },
                { identityPublicKey, filter, moderators, description, nonce, signature },
                { checkAuthority: false });

            await communities.updateOne(
                { name: community },
                {
                    $setOnInsert: {
                        createdAt: Date.now(),
                        createdBy: identityPublicKey,
                        name: community,
                        logo: "",
                        subscribers: [],
                    },
                    $set: {
                        ownerPublicKey: identityPublicKey,
                        filter,
                        compiledFilter: JSON.stringify(compiledFilter),
                        moderators,
                        description
                    }
                },
                { upsert: true }
            );

            // 2 = updated
            // 1 = created
            return existingCommunity ? 2 : 1;
        });
    }

    async createAccount({
        nonce,
        username,
        identityPublicKey,
        walletPublicKey,
        publicKeyProofs,
        signature,
        // these values below are not commit to by the signature
        oauth,
        encryptedMnemonic: { mnemonic, test },
    }) {
        await this.lock(async () => {
            this.validateArray([identityPublicKey, walletPublicKey], 'publicKeys', false, idpk => KeyManager.isValidPublic(idpk));
            await this.validateUsername({ identityPublicKey, username });

            const publicKeysText = `${identityPublicKey} ${walletPublicKey}`;
            if (!KeyManager.verifyText(publicKeyProofs.identity, publicKeysText, identityPublicKey)) throw new Error(`Could not verify identity public key`);
            if (!KeyManager.verifyText(publicKeyProofs.wallet, publicKeysText, walletPublicKey)) throw new Error(`Could not verify wallet public key`);

            if (oauth && !KeyManager.verifyText(oauth.signature, await getActionCommitment({ name: "oauth-link", nonce, oauth }), identityPublicKey))
                throw new Error(`Could not verify oauth authorization`);

            const usernameLower = username.toLowerCase();

            await this.#commitAction(
                { name: 'create-account', id: usernameLower },
                { nonce, username, identityPublicKey, walletPublicKey, publicKeyProofs, signature });

            const { accounts, oauths } = await this.getDBO();
            let avatar = '';

            //
            // give permission to this oauth to access my account
            //
            const stateOAuth = this.state.oauth;
            if (oauth && stateOAuth &&
                oauth.id == stateOAuth.id &&
                oauth.provider == stateOAuth.provider) {

                //
                // we have a guarantee via [stateOAuth] that this client actually logged into the oauth
                // we have a proof via [oauth.proof] that this client actually wants to connect this oauth
                //
                const { ok, value: oauthDocument } = await oauths.findOneAndUpdate(
                    {
                        provider: oauth.provider,
                        id: oauth.id,
                        "accounts.identityPublicKey": { $ne: identityPublicKey },
                    },
                    {
                        $set: {
                            activeIdentityPublicKey: identityPublicKey
                        },
                        $push: {
                            accounts: { identityPublicKey, proof: oauth.proof }
                        }
                    }
                );

                if (ok && oauthDocument && oauthDocument.avatar) {
                    avatar = oauthDocument.avatar;
                }
            }

            //
            // create the account
            //
            await accounts.updateOne(
                { identityPublicKey },
                {
                    $setOnInsert: {
                        nonce,
                        createdAt: Date.now(),
                        username,
                        usernameLower: usernameLower,
                        identityPublicKey,
                        walletPublicKey,
                        publicKeyProofs,
                        avatar,
                        following: [],
                        followers: [],
                    },
                    $set: {
                        encryptedMnemonic: { mnemonic, test },
                    }
                },
                { upsert: true }
            );

            updateUserIdentity(username, identityPublicKey);
        });
        return true;
    }

    async seenDirectMessages() {
        const identityPublicKey = this.identityPublicKey;
        if (!identityPublicKey) return;

        const { accounts } = await this.getDBO();
        await accounts.updateOne({ identityPublicKey }, {
            $set: {
                lastCheckedMessages: Date.now()
            }
        });
    }
}

export default ActionGatewayController;