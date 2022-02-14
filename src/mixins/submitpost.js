import api from "../server/api";
import { PostObject } from "../server/api/objects";

export default {
    methods: {
        async submitPost(editor) {
            return await this.wait(async () => {
                const { post: refPost } = await editor.submitPost();
                if (refPost) {
                    editor.clear();

                    const { shortId, createdAt } = PostObject.decodeId(
                        refPost.getEncodedId()
                    );

                    const post = new PostObject(
                        await api.Search.getSinglePost({
                            username: refPost.username,
                            shortId,
                            createdAt: createdAt.getTime(),
                        })
                    );

                    this.$store.commit("set", ["submittedPost", post]);
                    return post;
                }
                return null;
            });
        },
    }
};