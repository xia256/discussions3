import { Mutex } from '../../utility';

export default class Account {
    static #mutexes = {};

    static #getOrCreateMutex(identityPublicKey) {
        let mutex = Account.#mutexes[identityPublicKey];
        if (!mutex) {
            mutex = Account.#mutexes[identityPublicKey] = new Mutex();
        }
        return mutex;
    }

    #identityPublicKey;
    #username;
    #usernameLower;
    #mutex;

    get identityPublicKey() { return this.#identityPublicKey; }
    get username() { return this.#username; }
    get usernameLower() { return this.#usernameLower; }
    get mutex() { return this.#mutex; }
    
    constructor (dboAccount) {
        this.#identityPublicKey = dboAccount.identityPublicKey;
        this.#username = dboAccount.username;
        this.#usernameLower = dboAccount.usernameLower;
        this.#mutex = Account.#getOrCreateMutex(dboAccount.identityPublicKey);
        //TO DEBUG:
//        console.log("USER ACCOUNT DATA");
//        console.log(this.#username);
//        console.log(this.usernameLower);
//        console.log(this.#mutex);
//        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
    }
}
