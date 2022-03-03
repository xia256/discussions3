import {
    Mutex,
    isValidUUID,
    validateUsername,
} from '../../utility';
import ServerConfig from "../server.config";
import { getDatabase, resolveToIdentities, resolveToUsernames, updateUserIdentities } from "../mongodb";
import GatewayServer from "./GatewayServer";
import { KeyManager } from "../../KeyManager";

export default class BaseGatewayController {
    static #mutex = new Mutex();

    #client;
    #id;
    #database;

    get client() { return this.#client; }
    get state() { return this.client.state; }
    get account() { return this.client.state.account; }

    get identityPublicKey() { return this.account?.identityPublicKey; }
    get username() { return this.account?.username; }

    constructor(client) {
        this.#client = client;
        this.#id = Mutex.createId();
    }

    getClientsByIdentities(identityPublicKeys) {
        return GatewayServer.getClientsByIdentities(identityPublicKeys);
    }

    requireIdentity(identityPublicKey) {
        if (!identityPublicKey)
            throw new Error(`Cannot require undefined identity`);
        if (this.identityPublicKey != identityPublicKey)
            throw new Error(`You are not logged into the correct account to perform this request!`);
        this.validatePublicKey(identityPublicKey);
    }

    isGlobalModerator(identityPublicKey) {
        return ServerConfig.globalModerators.includes(identityPublicKey);
    }

    requireZeroNonce(nonce) {
        if (nonce != 0) throw new Error(`Nonce must be zero`);
    }

    requireNotSelf(identityPublicKey) {
        if (this.identityPublicKey == identityPublicKey)
            throw new Error(`You cannot perform this action on yourself!`);
        if (!KeyManager.isValidPublic(identityPublicKey))
            throw new Error(`${identityPublicKey} is not a valid public key!`);
    }

    validatePublicKey(publicKey) {
        if (!KeyManager.isValidPublic(publicKey))
            throw new Error(`${publicKey} is not a valid public key`);
    }

    validateArray(array, name, allowEmpty, predicate) {
        if (!Array.isArray(array))
            throw new Error(`${name} must be an array`);
        if (!allowEmpty && array.lenght == 0)
            throw new Error(`${name} cannot be an empty array`);
        if (array.some(i => !predicate(i)))
            throw new Error(`${name} contains an invalid element`);
    }

    validateUUID(uuid, allowNull) {
        if (!uuid) {
            if (!allowNull) throw new Error(`UUID cannot be undefined`);
            return true;
        }
        if (!isValidUUID(uuid)) {
            throw new Error(`${uuid} is an invalid UUID`);
        }
    }

    async validateUsername({ identityPublicKey, username }) {
        validateUsername(username);

        return await this.lock(async () => {
            let existingPublicKey = undefined;

            try {
                const [epk] = await this.resolveToIdentities([username]);
                existingPublicKey = epk;
            }
            catch (ex) {
                return true; // doesn't exist
            }

            if (existingPublicKey) {
                if ((!identityPublicKey) || (identityPublicKey != existingPublicKey))
                    throw new Error(`This username is already in use`);
            }

            return true;
        });
    }

    async resolveToIdentities(usernames, tryUpdate = true, throwNotFound = true) {
        const result = await resolveToIdentities(usernames);
        const unresolved = result.findIndex(v => !v);
        if (unresolved > -1) {
            if (tryUpdate) {
                await updateUserIdentities();
                return await this.resolveToIdentities(usernames, false, true);
            }
            if (throwNotFound)
                throw new Error(`Could not resolve username ${usernames[unresolved]} to identity public key!`);
        }
        return result;
    }

    async resolveToUsernames(identityPublicKeys, tryUpdate = true) {
        const result = await resolveToUsernames(identityPublicKeys);
        const unresolved = result.findIndex(v => !v);
        if (unresolved > -1) {
            if (tryUpdate) {
                await updateUserIdentities();
                return this.resolveToUsernames(identityPublicKeys, false);
            }
            throw new Error(`Could not resolve identity public key ${identityPublicKeys[unresolved]} to username!`);
        }
        return result;
    }

    async getDBO({ account } = {}) {
        if (!this.#database) {
            this.#database = await getDatabase();
        }

        const dbo = this.#database;
        const actions = dbo.collection(ServerConfig.mongodb.collections.actions);
        const posts = dbo.collection(ServerConfig.mongodb.collections.posts);
        const accounts = dbo.collection(ServerConfig.mongodb.collections.accounts);
        const oauths = dbo.collection(ServerConfig.mongodb.collections.oauths);
        const hashtags = dbo.collection(ServerConfig.mongodb.collections.hashtags);
        const notifications = dbo.collection(ServerConfig.mongodb.collections.notifications);
        const messages = dbo.collection(ServerConfig.mongodb.collections.messages);
        const communities = dbo.collection(ServerConfig.mongodb.collections.communities);
        const proposals = dbo.collection(ServerConfig.mongodb.collections.proposals);

        let accountDBO = null;
        if (account) {
            const identityPublicKey = this.identityPublicKey;
            if (!identityPublicKey) throw new Error(`Cannot obtain account database object, you are not logged in!`);

            accountDBO = await accounts.findOne({ identityPublicKey });
            if (!accountDBO) throw new Error(`No account object found!`);
        }

        return {
            dbo,
            actions, posts, accounts,
            oauths, hashtags, notifications, 
            messages, communities, proposals,
            account: accountDBO
        };
    }

    async fork(callbackAsync) {
        return await callbackAsync();
    }

    async lock(callbackAsync) {
        return await BaseGatewayController.#mutex.lock(this.#id, async () => {
            return await callbackAsync();
        });
    }

    async lockAccount(callbackAsync) {
        const account = this.account;
        if (!account) throw new Error(`Cannot obtain lock on account as no account is present!`);
        return await account.mutex.lock(this.#id, async () => {
            return await callbackAsync();
        });
    }
}