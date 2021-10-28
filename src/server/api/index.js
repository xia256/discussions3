import io from 'socket.io-client';
import axios from 'axios';
import { signText, privateToPublic } from '../../KeyManager';
import { waitFor } from '../../utility';
import ServerConfig from  './config.json';
import Gateways from './gateways.json';

class ApiClient extends EventTarget {
    #callbacks;
    #socket;
    #clientId;

    get clientId() { return this.#clientId; }
    get socket() { return this.#socket; }
    get isReady() { return (this.clientId != 0); }

    constructor() {
        super();
        this.#reset();

        for (const key of Object.keys(Gateways)) {
            const name = key.replace(/GatewayController/gi, '');
            if (this[name]) {
                console.log(`Warning: ${key} conflicts via ${name} in api client and hasn't been registered!`);
                continue;
            }
            const controller = (this[name] ?? (this[name] = {}));
            for (const method of Object.keys(Gateways[key])) {
                controller[method] = (...args) => this.call(Gateways[key][method], ...args);
            }
        }
    }

    #reset() {
        this.#callbacks = {};
        this.#socket = null;
        this.#clientId = 0;
    }

    disconnect() {
        if (!this.socket) return;

        this.socket.disconnect();
        this.#reset();
    }

    async connect() {
        if (this.socket) return;

        const host = ServerConfig.url;
        //const host = 'http://192.168.0.11:5015';
        console.log(`Trying to connect to ${host}...`);

        const socket = io(host, {});

        socket.on('api', ({ id, payload, error }) => {
            const callback = this.#callbacks[id];
            if (callback) callback(payload, error);
        });

        socket.on('connect', () => {
            this.#readyUp(host);
        });

        socket.on('disconnect', () => {
            this.#clientId = 0;
            this.dispatchEvent(new CustomEvent('disconnect'));
        });

        socket.on('reconnect', () => {
            this.#readyUp(host);
            this.dispatchEvent(new CustomEvent('reconnect'));
        });

        socket.on('event', ({ name, payload }) => {
            //console.log(`Socket event ${name} with payload: `, payload)
            this.dispatchEvent(new CustomEvent(name, { detail: payload }));
        });

        this.#socket = socket;
    }

    async #readyUp(host) {
        console.log(`Socket is connected to ${host} attempting to ready up...`);

        const payload = await this.call('_ready', {}, false);
        this.#clientId = payload.id;

        console.log(`Ready with id ${this.clientId}!`);

        this.dispatchEvent(new CustomEvent('ready'));
        this.dispatchEvent(new CustomEvent('connection', { detail: { connected: true }}));
    }

    async restCall(endpoint, body, { key } = {}) {

        const host = `${ServerConfig.url}${ServerConfig.api}`;
        const url = `${host}${endpoint}`;

        let result = undefined;
        if (body) {
            if (key) {
                const signData = JSON.stringify({
                    ...body,
                    pub: privateToPublic(key),
                    time: Date.now()
                });

                const sig = await signText(signData, key);

                body = { sig, data: signData };
            }
            const { data } = await axios.post(url, body);
            result = data;
        }
        else {
            const { data } = await axios.get(url);
            result = data;
        }

        if (result.error) {
            throw new Error(result.message);
        }

        return result.payload;
    }

    call(method, data = {}, waitForReady = true) {
        if (!method) throw new Error(`Method was not specified!`);

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {

            if (waitForReady && !this.isReady) {
                await waitFor(0, async () => this.isReady);
            }

            const id = (Math.random() * 0x7fffffff) | 0;

            this.#callbacks[id] = (payload, error) => {
                if (error) reject(new Error(error));
                else resolve(payload);
            };

            //console.log(`Socket API`, { id, method, data });
            this.socket.emit('api', { id, method, data });
        });
    }

}

const client = new ApiClient();

if (typeof window != 'undefined') {
    // handle HMR
    if (window._hikiClient) {
        console.log('Disposing of old api client due to HMR');
        window._hikiClient.disconnect();
    }
    window._hikiClient = client;
}

export default client;