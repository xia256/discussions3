import BaseGatewayController from "./BaseGatewayController";
import { isOEmbeddable, getOEmbedHTML } from "../api/oembed";

class UtilityGatewayController extends BaseGatewayController {
    static #oembedCache = {};

    constructor(client) {
        super(client);
    }

    async ping(data) {
        return { pong: Date.now(), ...data };
    }

    async oembed({ href }) {
        if (!isOEmbeddable(href)) return "";

        let result = UtilityGatewayController.#oembedCache[href];
        if (!result) {
            result = UtilityGatewayController.#oembedCache[href] = await getOEmbedHTML(href);
        }
        return result;
    }

    async setRenderReady() {
        this.state.renderReady = true;
        return true;
    }

    async test({ a, b }) {
        return a * b;
    }
}

export default UtilityGatewayController;