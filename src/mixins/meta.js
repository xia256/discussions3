import ServerConfig from "../server/api/config.json";

const DEFAULT_META = {
    title: `${ServerConfig.name}`,
    description: `${ServerConfig.description}`,
    image: { url: ServerConfig.logo.startsWith('/') ? `${ServerConfig.url}${ServerConfig.logo}` : ServerConfig.logo, large: false, width: 40, height: 31 },
    video: { url: '', width: 0, height: 0 }
};

export default {
    data: () => ({
        meta: Object.assign({}, DEFAULT_META)
    }),
    metaInfo() {
        const meta = this.meta;

        let description = meta.description ?? "";
        let title = meta.title ?? "";
        const video = meta.video
        const image = meta.image;

        if (description.length > 160) description = description.substring(0, 157) + '...';
        if (title.length > 60) title = title.substring(0, 57) + '...';

        const card = (video?.url) ? "player" : (image?.large) ? "summary_large_image" : "summary";
        const type = (video?.url) ? "video.other" : "website";

        let metaData = [
            { name: "description", content: description },
            // open graph
            { property: "og:site_name", content: ServerConfig.name },
            { property: "og:type", content: type },
            { property: "og:title", content: title },
            { property: "og:description", content: description },
            // twitter
            { name: "twitter:site", content: "" }, // twitter handle
            { name: "twitter:title", content: title },
            { name: "twitter:description", content: description },
            { name: "twitter:card", content: card },
        ];

        if (image?.url) {
            metaData = [
                ...metaData,
                // open graph
                { property: "og:image", content: image.url },
                { property: "og:image:width", content: String(image.width) },
                { property: "og:image:height", content: String(image.height) },
                // twitter
                { name: "twitter:image", content: image.url },
            ];
        }

        if (video?.url) {
            metaData = [
                ...metaData,
                // open graph
                { property: "og:video:url", content: video.url },
                { property: "og:video:secure_url", content: video.url },
                { property: "og:video:type", content: "text/html" },
                { property: "og:video:width", content: String(video.width) },
                { property: "og:video:height", content: String(video.height) },
                // twitter
                { name: "twitter:player", content: video.url },
                { name: "twitter:player:width", content: String(video.width) },
                { name: "twitter:player:height", content: String(video.height) },
            ];
        }

        const result = {
            title: title,
            meta: metaData,
        };

        return result;
    },
    methods: {
        async setMeta({ title, description, image, video } = {}) {
            this.meta.title = title ?? DEFAULT_META.title;
            this.meta.description = description ?? DEFAULT_META.description;
            this.meta.image = image ?? DEFAULT_META.image;
            this.meta.video = video ?? DEFAULT_META.video;
        }
    }
};