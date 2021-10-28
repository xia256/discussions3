import { EventEmitter } from 'events';

export default class GatewayClient {
    #id;
    #socket;
    #state;
    #events;

    get events() { return this.#events; }
    get id() { return this.#id; }
    get socket() { return this.#socket; }
    get state() { return this.#state; }

    constructor(id, socket) {
        this.#events = new EventEmitter();
        this.#id = id;
        this.#socket = socket;
        this.#state = {};
        socket.on('disconnect', () => this.#onSocketDisconnect());
        socket.on('api', ({ id, method, data }) => this.#onApiRequest(id, method, data));
    }

    log(message) {
        return this.push('log', message);
    }

    reply({ id, payload, error }) {
        return this.socket.emit('api', { id, payload, error });
    }

    push(eventName, payload = {}) {
        //console.log(`Pushing to client ${this.id}`, eventName, payload);
        return this.socket.emit('event', { name: eventName, payload });
    }

    #onSocketDisconnect() {
        //console.log(`Client ${this.id} disconnected`);
        this.events.emit('disconnect', this);
    }

    #onApiRequest(id, method, data) {
        this.events.emit('api', this, id, method, data);
    }
}