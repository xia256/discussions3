import bigInt from 'big-integer';

//import { KeyManager } from "../../../KeyManager";
import { parseDocument } from "../../../utility";
import ServerConfig from "../config.json";
import routes from "../../routes";

export default class PostObject {

    static link(username, encodedId, title) {
        let snakeTitle = '_';
        if (title) {
            snakeTitle = title
                .trim()
                .replace(/[^0-9a-z]/gi, ' ')
                .split(' ')
                .filter(s => s && s.length >= 2)
                .map(s => s.toLowerCase())
                .slice(0, 10)
                .join('-')
                || '_';
        }

        const { path } = routes.find(({ name }) => name == "viewpost");
        return path
            .replace(':username', username)
            .replace(':encodedId', encodedId)
            .replace(':title?', snakeTitle);
    }

    static encodeId(id, createdAt) {
        const shortId = bigInt(id.substring(0, 8), 16); // 16 bit
        const shortTime = bigInt(Math.floor((createdAt.getTime() - ServerConfig.genesis) / 1000), 10); // 32 bit
        return shortId.shiftLeft(32).or(shortTime).toString(36); // 48 bit
    }

    static decodeId(encodedId) {
        const n = bigInt(encodedId, 36);
        const shortId = n // take top 16 bits
            .shiftRight(32)
            .toString(16)
            .padStart(8, '0');
        const shortTime = n.and(bigInt('ffffffff', 16)); // take bottom 32 bits
        const createdAt = new Date(shortTime.valueOf() * 1000 + ServerConfig.genesis);
        return {
            shortId,
            createdAt
        }
    }

    #totalLikes;
    #relativeDepth;

    #document;
    #documentContent;

    #threadMap;

    get document() {
        if (this.#documentContent != this.content) {
            // update document since it documentContent doesn't match content
            this.#documentContent = this.content;
            this.#document = parseDocument(this.#documentContent);
        }
        return this.#document;
    }

    get totalLikes() { return this.#totalLikes ? this.#totalLikes : this.likes.length; }
    set totalLikes(value) { this.#totalLikes = value; }

    get parent() { return this.parentId ? this.#threadMap[this.parentId] : null; }
    get thread() { return this.threadId ? this.#threadMap[this.threadId] : null; }

    get relativeDepth() { return this.#relativeDepth ?? (1 + (this.parent?.relativeDepth ?? 0)); }
    set relativeDepth(value) { return this.#relativeDepth = value; }

    get isNsfw() { return this.flaggedNsfwBy.length > 0 || this.hashtags.some(ht => ht == 'nsfw'); }
    get isIgnored() { return this.ignoredBy.length > 0; }

    constructor(dbo = null) {
        this.id = '';
        this.parentId = '';
        this.threadId = '';
        this.community = '';
        this.avatar = '';
        this.username = '';
        this.title = '';
        this.createdAt = new Date(0);
        this.updatedAt = new Date(0);
        this.content = '';
        this.plainText = '';
        this.totalReplies = 0;
        this.totalShares = 0;
        this.directReplies = [];
        this.indirectReplies = [];
        this.replyContext = null;
        this.#threadMap = {};
        this.depth = 0;
        this.identityPublicKey = '';
        this.signature = '';
        this.likes = [];
        this.mentions = [];
        this.hashtags = [];
        this.isLiked = false;
        this.ignoredBy = [];
        this.flaggedNsfwBy = [];
        this.tips = [];
        this.pinned = 0;

        if (dbo) this.fromDBO(dbo);
    }

    getLink() {
        return PostObject.link(this.username, this.getEncodedId(), this.title);
    }

    getEncodedId() {
        return PostObject.encodeId(this.id, this.createdAt);
    }

    fromDBO(dbo) {
        this.id = dbo.id;
        this.parentId = dbo.parentId;
        this.threadId = dbo.threadId;
        this.community = dbo.community;
        this.avatar = dbo.avatar;
        this.title = dbo.title ?? '';
        this.username = dbo.username;
        this.createdAt = new Date(dbo.createdAt);
        this.updatedAt = dbo.updatedAt ? new Date(dbo.updatedAt) : new Date(dbo.createdAt);
        this.content = dbo.content;
        this.plainText = dbo.plainText;
        this.totalReplies = dbo.totalReplies;
        this.#totalLikes = dbo.totalLikes;
        this.identityPublicKey = dbo.identityPublicKey;
        this.signature = dbo.signature;
        this.depth = dbo.depth;
        this.mentions = dbo.mentions;
        this.hashtags = dbo.hashtags;
        this.isLiked = dbo.isLiked;
        this.ignoredBy = dbo.ignoredBy;
        this.flaggedNsfwBy = dbo.flaggedNsfwBy;
        this.pinned = isNaN(dbo.pinned) ? 0 : dbo.pinned;

        this.updateThreadMap([this], false);

        if (dbo.thread) {
            this.updateThreadMap(dbo.thread.map(p => new PostObject(p)), false);
        }

        if (dbo.replyContext) {
            this.updateThreadMap(dbo.replyContext.map(p => new PostObject(p)), false);
        }

        if (dbo.tips && dbo.tips.length > 0) {
            this.tips = dbo.tips;
        }

        this.updateThreadMap(); // commit

        return this;
    }

    toDBO() {
        const document = this.document;
        const plainText = document.body.innerText ?? document.body.textContent;

        const h1 = document.body.querySelector('h1');
        const title = h1 ? (h1.innerText ?? h1.textContent) : '';

        return {
            id: this.id,
            parentId: this.parentId,
            threadId: this.threadId,
            community: this.community,
            avatar: this.avatar,
            title: title,
            username: this.username,
            updatedAt: this.updatedAt.getTime(),
            content: this.content,
            plainText: plainText,
            totalReplies: this.totalReplies,
            totalShares: this.totalShares,
            likes: this.likes,
            identityPublicKey: this.identityPublicKey,
            signature: this.signature,
            depth: this.depth,
            mentions: this.mentions,
            hashtags: this.hashtags
        };
    }

    updateThreadMap(posts = [], commit = true) {

        const threadMap = this.#threadMap;

        posts
            .filter(p => !threadMap[p.id])
            .forEach(p => {
                threadMap[p.id] = p;
                p.#threadMap = threadMap;
            });

        if (!commit) return;

        const op = threadMap[this.threadId];
        if (!op) return;

        for (const p of Object.values(threadMap)) {
            p.directReplies = [];
            p.indirectReplies = [];
        }

        for (const p of Object.values(threadMap)) {
            if (!p.parentId) continue;

            const parent = threadMap[p.parentId];

            if (!parent) {
                op.indirectReplies.push(p);
            }
            else {
                parent.directReplies.push(p);
            }
        }


        if (this.id != this.threadId) {
            this.replyContext = threadMap[this.threadId];
        }

    }
}