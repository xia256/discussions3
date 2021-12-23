import Timer from "./timer";
import Mutex from "./Mutex";
import _sanitizeHTML from "sanitize-html";
import ecc from "eosjs-ecc";

import {
    v4 as uuidv4,
    version as uuidVersion,
    validate as uuidValidate
} from 'uuid';

const mentionRegex = /^[0-9A-Za-z_]*$/i;

function generateUUID() {
    return uuidv4();
}

function isValidUUID(uuid) {
    return uuidValidate(uuid) && uuidVersion(uuid) === 4;
}

function shortDateString(date) {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const YEAR = 365 * DAY;

    const delta = Date.now() - date.getTime();
    if (delta < MINUTE) return `${Math.max(1, Math.floor(delta / SECOND))}s`;
    if (delta < HOUR) return `${Math.max(1, Math.floor(delta / MINUTE))}m`;
    if (delta < DAY) return `${Math.max(1, Math.floor(delta / HOUR))}h`;

    const [dayOfWeek, month, day, year] = date.toDateString().split(' ');
    dayOfWeek;
    return (delta < YEAR) ? `${month} ${day}` : `${month} ${day} ${year}`;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateUsername(username) {
    if (!username || username.length < 3) throw new Error(`Username must be atleast 3 characters`);
    if (!username.match(new RegExp(mentionRegex))) throw new Error(`Username must only contain alphanumeric characters or underscores`);
    if (username.length > 15) throw new Error(`Username must be 15 characters or less`);
}

async function waitFor(timeout, predicateAsync) {
    const start = Date.now();
    for (; ;) {
        const condition = await predicateAsync();

        if (condition)
            return condition;

        if (timeout > 0 && (Date.now() - start) >= timeout)
            return false;

        await delay(5);
    }
}

function createDOMParser() {
    if (typeof DOMParser !== 'undefined') {
        return new DOMParser();
    }
    else {
        const jsdom = require("jsdom");
        const { JSDOM } = jsdom;
        return new (new JSDOM()).window.DOMParser();
    }
}

function parseDocument(html) {
    const parser = createDOMParser();
    const document = parser.parseFromString(html, 'text/html');
    return document;
}

function sanitizeHTML(html, { allowedTags } = { allowedTags: [] }) {

    // guard against characters that have jank rendering
    // note: this was commented out since we now guard using overflow hidden
    //html = html.replace(/([\u0300-\u036F]|[\uD800-\uDFFF]|[\u1E00-\u1EFF]|[\u2300-\u23FF]|[\u0E00-\u0E7F])+/g, ' ');

    return _sanitizeHTML(html, {
        allowedTags: [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "blockquote",
            "p",
            "span",
            "a",
            "ul",
            "ol",
            "nl",
            "li",
            "b",
            "i",
            "s",
            "img",
            "strong",
            "em",
            "strike",
            "code",
            "center",
            "hr",
            "br",
            "div",
            "table",
            "thead",
            "caption",
            "tbody",
            "tr",
            "th",
            "td",
            "pre",
            ...allowedTags
        ],
        //allowVulnerableTags: true,
        allowedAttributes: {
            ..._sanitizeHTML.defaults.allowedAttributes,
            span: ["data-value", "data-denotation-char", "class"],
            a: ["class", "data-denotation-char", "href", "target"],
            blockquote: ["class"],
            div: [
                "data-hiki-oembed",
                "class",
                "data-embed-media", "data-embed-parent", "data-embed-live", "data-embed-uuid", "data-embed-created"
            ],
            iframe: ["width", "height", "src", "frameborder", "allow", "allowfullscreen"],
            //script: ["async", "src", "charset"]
        },
    });
}

//Helper function similar to sanitizeHTML but without the images and other tags that take too much space.
function thumbHTML(html, { allowedTags } = { allowedTags: [] }) {

    // guard against characters that have jank rendering
    // note: this was commented out since we now guard using overflow hidden
    //html = html.replace(/([\u0300-\u036F]|[\uD800-\uDFFF]|[\u1E00-\u1EFF]|[\u2300-\u23FF]|[\u0E00-\u0E7F])+/g, ' ');

    return _sanitizeHTML(html, {
        allowedTags: [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "blockquote",
            "p",
            "span",
            "nl",
            "b",
            "i",
            "s",
            "strong",
            "em",
            "strike",
            "center",
            "hr",
            "br",
            "tr",
            "th",
            "td",
            "pre",
            ...allowedTags
        ],
        //allowVulnerableTags: true,
        allowedAttributes: {
            ..._sanitizeHTML.defaults.allowedAttributes,
            span: ["data-value", "data-denotation-char", "class"],
            a: ["class", "data-denotation-char", "href", "target"],
            blockquote: ["class"],
            div: [
                "data-hiki-oembed",
                "class",
                "data-embed-media", "data-embed-parent", "data-embed-live", "data-embed-uuid", "data-embed-created"
            ],
            iframe: ["width", "height", "src", "frameborder", "allow", "allowfullscreen"],
            //script: ["async", "src", "charset"]
        },
    });
}

function isVisible($el) {
    return ($el.offsetWidth + $el.offsetHeight) > 0;
}

async function getActionCommitment($action) {
    let values = [];
    const { name } = $action;
    switch (name) {
        case "follow": {
            const { value, followPublicKey, nonce } = $action;
            values = [nonce, value ? 1 : 0, followPublicKey];
            break;
        }
        case "block": {
            const { value, blockPublicKey, nonce } = $action;
            values = [nonce, value ? 1 : 0, blockPublicKey];
            break;
        }
        case "like":
        case "nsfw-post":
        case "ignore-post": {
            const { postId, value, nonce } = $action;
            values = [nonce, value ? 1 : 0, postId];
            break;
        }
        case "post": {
            const { id, nonce, content, parentId, threadId, hashtags, mentions, community } = $action;
            const contentCommitment = ecc.sha256(content);
            const hashtagCommitment = ecc.sha256(hashtags.join(','));
            const mentionCommitment = ecc.sha256(mentions.join(','));
            values = [nonce, contentCommitment, id, parentId, threadId, community, hashtagCommitment, mentionCommitment];
            break;
        }
        case "jl-community": {
            const { community, value, nonce } = $action;
            values = [nonce, value ? 1 : 0, community];
            break;
        }
        case "create-community": {
            const { nonce, community, filter, moderators, description } = $action;
            const descriptionCommitment = ecc.sha256(description);
            const moderatorCommitment = ecc.sha256(moderators.join(','));
            values = [nonce, community, filter, moderatorCommitment, descriptionCommitment ];
            break;
        }
        case "create-account": {
            const { nonce, username, identityPublicKey, walletPublicKey, publicKeyProofs } = $action;
            values = [nonce, username, identityPublicKey, walletPublicKey, publicKeyProofs.identity, publicKeyProofs.wallet];
            break;
        }
        // off-chain actions
        case "oauth-link": {
            const { nonce, oauth: { id, provider } } = $action;
            values = [nonce, id, provider];
            break;
        }
        case "login-challenge": {
            const { nonce } = $action;
            values = [nonce];
            break;
        }
        default:
            throw new Error(`Unknown action ${name}`);
    }
    if (values.length == 0) throw new Error(`Unexpected action ${name} has no commitment values!`);
    return `${name}: ${values.join(' ')}`;
}

function tryParseJson(json) {
    try {
        return JSON.parse(json);
    }
    catch (ex) {
        return undefined;
    }
}

function linkEquals(l1, l2) {
    if (l1 == l2) return true;
    if (!l1) return false;
    if (!l2) return false;

    l1 = decodeURI(l1).trim();
    l2 = decodeURI(l2).trim();

    const l1q = l1.indexOf('?');
    const l2q = l2.indexOf('?');

    l1 = (l1q > -1) ? l1.substring(0, l1q) : l1;
    l2 = (l2q > -1) ? l2.substring(0, l2q) : l2;

    l1 += (l1.lastIndexOf('/') != l1.length - 1) ? '/' : '';
    l2 += (l2.lastIndexOf('/') != l2.length - 1) ? '/' : '';

    if (l1 == l2) {
        //console.log(l1);
        //console.log(l2);
        return true;
    }
    return false;
}

export {
    generateUUID,
    isValidUUID,
    shortDateString,
    delay,
    waitFor,
    validateUsername,
    createDOMParser,
    parseDocument,
    sanitizeHTML,
    thumbHTML,
    isVisible,
    getActionCommitment,
    tryParseJson,
    linkEquals,
    mentionRegex,
    Timer,
    Mutex
}
