import axios from 'axios';

const LINK_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=!]*)/gi;
const TWITTER_REGEX = /https:\/\/(mobile.)?twitter.com\/[a-zA-Z0-9-_]+\/status\/[0-9]+/gi;
const HIKI_REGEX = /https?:\/\/[a-z0-9:.]+\/p\/[a-z0-9_]+\/[a-z0-9]{10,}/gi;
const REDDIT_REGEX = /https?:\/\/www.reddit.com\/r\/[a-z0-9]+\/comments\/[a-z0-9]{6,}\/[a-z0-9_]+\/?.*/gi;
const YOUTUBE_REGEX = /https?:\/\/(www.|m.)?youtube.com\/watch/gi;
const YOUTUBE_SHORT_REGEX = /https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/gi;

function isOEmbeddable(href) {
    if (new RegExp(TWITTER_REGEX).test(href)) {
        return true;
    }
    else if (new RegExp(YOUTUBE_REGEX).test(href) || new RegExp(YOUTUBE_SHORT_REGEX).test(href)) {
        return true;
    }
    else if (new RegExp(HIKI_REGEX).test(href)) {
        return true;
    }
    else if (new RegExp(REDDIT_REGEX).test(href)) {
        return true;
    }
    return false;
}

async function getOEmbedHTML(href) {
    let html = '';

    try {
        if (new RegExp(TWITTER_REGEX).test(href)) {
            const { data } = await axios.get(`https://publish.twitter.com/oembed?url=${href}`);
            html = data.html;
        }
        else if (new RegExp(YOUTUBE_REGEX).test(href) || new RegExp(YOUTUBE_SHORT_REGEX).test(href)) {
            const { data } = await axios.get(`https://www.youtube.com/oembed?format=json&url=${href.replace(/feature=(.*?)&/, '')}`);
            html = data.html?.replace(/width="[0-9]+" height="[0-9]+"/, `width="560" height="315"`);
        }
        else if (new RegExp(HIKI_REGEX).test(href)) {
            const [, , , , username, id] = href.split('/');
            html = `<div data-hiki-oembed="${username} ${id}"></div>`;
        }
        else if (new RegExp(REDDIT_REGEX).test(href)) {
            const { data } = await axios.get(`https://www.reddit.com/oembed?url=${href}`);
            html = data.html;
        }
    }
    catch (ex) {
        html = '';
        //console.log(ex);
    }

    return html;
}

export {
    LINK_REGEX,
    TWITTER_REGEX,
    HIKI_REGEX,
    REDDIT_REGEX,
    YOUTUBE_REGEX,
    YOUTUBE_SHORT_REGEX,
    isOEmbeddable,
    getOEmbedHTML,
}