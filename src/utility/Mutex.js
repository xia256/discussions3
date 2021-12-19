import { delay } from "./index";
import { v4 as uuidv4 } from 'uuid';

export default class Mutex {
    static createId() {
        return uuidv4();
    }

    #ownerId;
    #lockCount;

    get ownerId() { return this.#ownerId; }
    get locked() { return this.#ownerId != null; }

    constructor() {
        this.#ownerId = null;
        this.#lockCount = 0;
    }

    async lock(ownerId, callbackAsync) {
        // no id specified, generate a new one
        if (!ownerId) {
            ownerId = Mutex.createId();
        }

        // only wait if we're locking on a new owner
        while (this.locked && this.ownerId != ownerId) {
            await delay(1);
        }

        try {
            this.#ownerId = ownerId;
            this.#lockCount += 1;
            const result = await callbackAsync(ownerId);
            return result;
        }
        finally {
            this.#lockCount -= 1;
            if (this.#lockCount == 0) {
                this.#ownerId = null; // release lock from this owner
            }
        }
    }
}