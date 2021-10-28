import { sanitizeHTML, linkEquals } from "./utility";
import routes from "./server/routes";

import api from "./server/api";
import { isOEmbeddable } from "./server/api/oembed";
import { PostObject } from "./server/api/objects";

import Vue from 'vue';
import vuetify from './plugins/vuetify';
import store from './plugins/vuex';
import router from './plugins/router';

import Post from './components/Post';

export default class DOMFixer {
    constructor() {
    }

    mentionLink(denotationChar, text) {
        let href = '';
        if (denotationChar == "@") {
            href = routes
                .find(({ name }) => name == "profile")
                .path.replace(":username", text);
        } else if (denotationChar == "#") {
            href = routes
                .find(({ name }) => name == "tag")
                .path.replace(":hashtag", text);
        } else if (denotationChar == "*") {
            href = routes
                .find(({ name }) => name == "viewcommunity")
                .path.replace(":communityName", text);
        }
        return href;
    }

    createMentionElement(denotationChar, text) {
        const link = this.mentionLink(denotationChar, text);
        const mention = document.createElement("span");
        mention.setAttribute("class", "mention");
        mention.setAttribute("data-denotation-char", denotationChar);
        mention.innerHTML = `&#65279;<span contenteditable="false"><span class="ql-mention-denotation-char">${denotationChar}</span><a href="${link}" target="_blank">${text}</a></span>&#65279;`;
        return mention;
    }

    // attempt to fix mentions being written in the ql editor
    async qlEditor($el) {
        $el = $el ?? document;

        const nodes = Array.from(
            $el.querySelectorAll(
                '.ql-editor a[href="@"], .ql-editor a[href="#"]'
            )
        );

        for (const node of nodes) {
            const parent = node.parentNode;
            const denotationChar = node.textContent.substring(0, 1);
            const text = node.textContent.trim().substring(1);
            const mention = this.createMentionElement(denotationChar, text);
            parent.insertBefore(mention, node);
            parent.removeChild(node);
        }
    }

    // attempt to fix it when on mobile writing a tag doesn't properly register as a tag
    async qlEditorMobile($el) {

        $el = $el ?? document;
        // we can consider adding "@" to this as well, but it means we may need to allow tagging of a user that doesn't exist
        const mentionPrefixedRegex = /[#][0-9A-Za-z_]{3,}(\s|&nbsp;)/gi;
        const nodes = Array.from($el.querySelectorAll(".ql-editor p"));

        for (const p of nodes) {
            // find lone text nodes in `p` elements
            const textNodes = Array.from(p.childNodes ?? []).filter(n => n.nodeType == Node.TEXT_NODE);
            for (const textNode of textNodes) {
                // check text node if it has any matches of our regex
                let textContent = textNode.textContent;
                const matches = textContent.match(new RegExp(mentionPrefixedRegex)) ?? [];
                const insertNodes = [];

                for (const mention of matches) {
                    // the denotation character will always be the first charater
                    // if &nbsp; the text before it (minus the denotation char) is the text content,
                    const denotationChar = mention.substring(0, 1);
                    const ampIndex = mention.indexOf('&');
                    const text = (ampIndex > -1) ? mention.substring(1, ampIndex) : mention.substring(1, mention.length - 1);

                    // if the index>0, then we need to preserve the text before it as a new text node
                    const index = textContent.indexOf(mention);
                    if (index > 0) insertNodes.push(document.createTextNode(textContent.substring(0, index)));

                    // insert the new mention node
                    insertNodes.push(this.createMentionElement(denotationChar, text));

                    // include the trailing space at the end of our regex
                    textContent = ' ' + textContent.substring(index + mention.length);
                }

                // process all the node changes that now need to occur
                if (insertNodes.length > 0) {
                    // the trailing textContent at the end
                    if (textContent) insertNodes.push(document.createTextNode(textContent));

                    const parent = textNode.parentNode;

                    for (const n of insertNodes)
                        parent.insertBefore(n, textNode);

                    parent.removeChild(textNode);
                }
            }
        }
    }

    // attempt to fix any mentions in a post content either @/#
    async postMentions($el) {
        const nodes = Array.from($el.querySelectorAll(".post__content .mention"));
        for (const node of nodes) {
            const anchor = node.querySelector("a");
            if (!anchor) continue;
            if (anchor.getAttribute("data-fixed")) continue;

            const textContent = node.textContent.trim();
            if (!textContent) continue;

            const denotationChar = textContent.substring(0, 1);
            const text = textContent.substring(1);
            const href = this.mentionLink(denotationChar, text);
            if (!href) continue;

            if (denotationChar == "@") {
                anchor.onmouseover = (e) => {
                    window.$App.openPopover("profile", { $el: e.target }, { username: text });
                    e.preventDefault();
                };
            }

            anchor.setAttribute("data-fixed", true);
            anchor.setAttribute("target", "");
            anchor.setAttribute("href", href);
            anchor.onclick = (e) => {
                window.$App.$router.push(href).catch(() => { }); // ignore redundant navigation
                e.preventDefault();
            };
        }
    }

    // hide overflowing post content with a fade
    async postContent($el) {
        $el = $el ?? document;

        let nodes = Array
            .from($el.querySelectorAll(".post__content:not(.post__content--faded):not(.post__content--nofaded)"))
            .filter(node => (node.scrollHeight > node.clientHeight) || node.classList.contains('post__content--blur'));

        for (const node of nodes) {
            node.classList.add("post__content--faded");
        }
    }


    // attempt to oembed
    async postOEmbed($el) {
        $el = $el ?? document;
        //console.log(`postOEmbed()`);

        let embedCount = 0;
        const nodes = Array.from($el.querySelectorAll(".post__content a"));
        for (const node of nodes) {
            const postContentNode = node.closest(".post__content");
            if (!postContentNode) continue;
            if (postContentNode.getAttribute('data-oembed') == 1) continue;
            if (node.getAttribute('data-oembed') == 1) continue;
            node.setAttribute('data-oembed', 1);

            const { href, textContent: text } = node;

            if (!linkEquals(href, text)) {
                //console.log(href);
                //console.log(text);
                continue;
            }
            else {
                //console.log(href, 'is embeddable');
            }

            let html = '';

            if (!isOEmbeddable(href)) {
                //console.log(href);

                const IMAGE_REGEX = /(.|)http[s]?:\/\/(\w|[:/.%-])+\.(png|jpg|jpeg|gif)(\?(\w|[:/.%-])+)?(.|)/gi;
                if (IMAGE_REGEX.test(href)) {
                    let _href = href;
                    html = `<img src="${_href}" />`;
                }
            }
            else {
                html = await api.Utility.oembed({ href });
            }

            //console.log(html);

            if (html) {
                // even though it's our api server, we shouldn't trust the payload
                // since it could contain malicious scripts
                let sanitized = sanitizeHTML(html, { allowedTags: ['iframe'] });

                const div = document.createElement('div');
                div.innerHTML = sanitized;

                const parent = node.parentNode;
                parent.insertBefore(div, node);
                parent.removeChild(node);

                embedCount++;
            }

        }

        if (embedCount > 0) {
            window.twttr?.widgets.load();
            window.rembeddit?.init();

            const hikiEmbeds = Array.from($el.querySelectorAll("div[data-hiki-oembed]:not(.hiki--embedded)"));
            for (const node of hikiEmbeds) {
                node.classList.add("hiki--embedded");

                const [username, encodedId] = node.getAttribute('data-hiki-oembed').split(' ');
                const { shortId, createdAt } = PostObject.decodeId(encodedId);
                const community = window.$App.$route.params.communityName;

                const post = new PostObject(await api.Search.getSinglePost({
                    username,
                    shortId,
                    createdAt: createdAt.getTime(),
                    community
                }));

                const PostComponent = Vue.extend(Post);
                new PostComponent({
                    vuetify,
                    store,
                    router,
                    propsData: {
                        post,
                        embedded: true
                    }
                }).$mount(node);
            }
        }
    }
}

