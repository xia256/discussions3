import GatewayClient from "./GatewayClient";
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import socketio from 'socket.io';

export default class GatewayServer {
    static #allClients = {};

    static get clients() { return Object.values(GatewayServer.#allClients); }

    static getClientById(id) {
        return GatewayServer.#allClients[id];
    }

    static getClientsByIdentities(identityPublicKeys) {
        if (identityPublicKeys.some(idpk => !idpk)) throw new Error(`identityPublicKeys contains an empty entry`);
        return GatewayServer.clients.filter(c => {
            const identityPublicKey = c.state.account?.identityPublicKey;
            if (!identityPublicKey) return false;
            if (!identityPublicKeys.includes(identityPublicKey)) return false;
            return true;
        });
    }

    #controllers;
    get controllers() { return this.#controllers; }

    constructor(controllers) {
        this.#controllers = controllers;
    }

    listen(app, port) {

        const server = http.Server(app);
        const io = socketio(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        server.listen(port);
        io.on('connect', socket => {
            const client = new GatewayClient(uuidv4(), socket);
            GatewayServer.#allClients[client.id] = client;
            client.events.on('disconnect', () => delete GatewayServer.#allClients[client.id]);
            client.events.on('api', (...args) => this.#onApiRequest(...args));
        });

        return { server, io };
    }

    async #onApiRequest(client, id, method, data) {
        try {
            //console.log(`onApiRequest`, id, method, data);

            if (method == "_ready") {
                return client.reply({ id, payload: { id: client.id } });
            }

            const [controllerName, methodName] = method.split('.');

            const ControllerType = this.controllers[controllerName];
            if (!ControllerType) throw new Error(`Controller ${controller} was not found`);

            const controller = new ControllerType(client);

            const dispatcher = controller[methodName];
            if (!dispatcher) throw new Error(`Controller ${controller} does not contain method ${methodName}`);

            const payload = await dispatcher.apply(controller, [data]);
            return client.reply({ id, payload });
        }
        catch (error) {
            console.log(method, data);
            console.log(error);
            return client.reply({ id, error: error.message });
        }
    }
}