import ecc from 'eosjs-ecc';
import aes from './aes';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { spawn, Worker } from "threads";
import Long from 'long';

let _eccWorker = undefined;
if (typeof window != "undefined") {
    const worker = new Worker("./workers/ecc");
    spawn(worker)
        .then((ew) => {
            _eccWorker = ew;
            console.log(`Created ecc background worker`);
        });
}

async function signText(text, key) {
    if (_eccWorker) {
        return await _eccWorker.sign(text, key);
    }
    else {
        return ecc.sign(text, key);
    }
}

async function signHash(hash256, key) {
    if (_eccWorker) {
        return await _eccWorker.signHash(hash256, key);
    }
    else {
        return ecc.signHash(hash256, key);
    }
}

function publicKeyToString(pub) {
    // https://github.com/EOSIO/eosjs-ecc/blob/master/src/key_public.js#L46
    return `PUB_K1_${ecc.key_utils.checkEncode(pub.toBuffer(), 'K1')}`;
}

function privateToPublic(wif) {
    return publicKeyToString(ecc.PrivateKey(wif).toPublic());
}

class KeyManager {

    static publicKeyToLegacy(publicKey) {
        return new ecc.PublicKey(publicKey).toString();
    }

    static legacyToPublicKey(legacyPublicKey) {
        return publicKeyToString(new ecc.PublicKey(legacyPublicKey));
    }

    static async create(mnemonic) {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error(`Invalid mnemonic!`);
        }

        const manager = new KeyManager();
        await manager.setMnemonic(mnemonic);
        manager.deriveKeys();
        return manager;
    }

    static async decrypt(passwordText, { mnemonic, test }, keyIndices = [0, 1], salt = 'k0mor!') {

        const passwordHash256 = ecc.sha256(passwordText + salt, null);
        if (aes.decrypt(Buffer.from(test, 'hex'), passwordHash256).toString('utf8') != 'test') {
            throw new Error(`Failed to decrypt, could not verify password`);
        }

        const plainMnemonic = aes.decrypt(Buffer.from(mnemonic, 'hex'), passwordHash256).toString('utf8');
        //console.log(plainMnemonic);

        return await KeyManager.create(plainMnemonic, keyIndices);
    }

    static generateMnemonic() {
        return bip39.generateMnemonic(256);
    }

    static isValidPublic(pub) {
        return ecc.isValidPublic(pub, `PUB_K1_`);
    }

    static recoverTextKey(signature, text) {
        const sig = ecc.Signature.from(signature);
        const rpub = publicKeyToString(sig.recover(text, 'utf8'));
        return rpub;
    }

    static verifyText(signature, text, pub) {
        return (this.recoverTextKey(signature, text) == pub);
    }

    static verifyHash(signature, hash256, pub) {
        signature;
        hash256;
        pub;
        throw new Error(`not implemented`);
    }

    #mnemonic;
    #node;
    #keys;

    get keys() { return this.#keys; }
    get mnemonic() { return this.#mnemonic; }

    constructor() {
        this.#mnemonic = null;
        this.#node = null;
        this.#keys = {};
    }

    encrypt(passwordText, salt = 'k0mor!') {
        this.requireMnemonic();

        const passwordHash256 = ecc.sha256(passwordText + salt, null);
        const mnemonic = aes.encrypt(this.#mnemonic, passwordHash256).toString('hex');
        const test = aes.encrypt('test', passwordHash256).toString('hex');

        return { mnemonic, test };
    }

    dispose() {
        this.#mnemonic = null;
        this.#node = null;
        this.#keys = null;
    }

    async setMnemonic(mnemonic) {
        this.#mnemonic = mnemonic;
        if (this.#mnemonic) {
            const seed = await bip39.mnemonicToSeed(this.#mnemonic);
            const node = await bip32.fromSeed(seed);
            this.#node = node;
        }
    }

    requireMnemonic() {
        if (!this.#mnemonic) {
            throw new Error(`This operation cannot be performed as the wallet instance does not contain a mnemonic`);
        }
    }

    redact(preserve = ['identity']) {
        for (const index in Object.keys(this.#keys)) {
            if (preserve.some(pi => pi == index)) continue;
            this.#keys[index]?.redact();
        }
        this.#mnemonic = null;
        this.#node = null;
    }

    deriveKeys() {
        this.requireMnemonic();

        const pathToKey = (path) => {
            const child = this.#node.derivePath(path);
            const secret = ecc.PrivateKey(child.privateKey);

            // https://github.com/EOSIO/eosjs-ecc/blob/master/src/key_public.js#L46
            const pub = publicKeyToString(secret.toPublic());

            return new KeyManagerKey(secret.toWif(), pub);
        }

        //
        // legacy compatability with discussions 
        // https://github.com/Novusphere/discussions-vue/blob/master/src/novusphere-js/uid/index.js
        //
        this.#keys['identity'] = pathToKey(`m/80'/0'/0'/0`);
        this.#keys['wallet'] = pathToKey(`m/80'/0'/0'/1`);
    }

    restoreKeys(keys) {
        for (const index in keys) {
            const { secret, pub } = keys[index];
            this.#keys[index] = new KeyManagerKey(secret, pub);
        }
    }
}

class KeyManagerKey {
    secret;
    pub;

    constructor(secret, pub) {
        this.secret = secret;
        this.pub = pub;
    }

    #requireSecret() {
        if (!this.secret) throw new Error(`This operation cannot be performed as the secret key is redacted`);
    }

    redact() {
        this.secret = null;
    }

    async endToEndEncryptText(toPublicKey, text) {
        let textEncoder = null;
        if (typeof TextEncoder != "undefined") {
            textEncoder = new TextEncoder();
        }
        else {
            const { TextEncoder } = require('util');
            textEncoder = new TextEncoder();
        }

        const { nonce, message, checksum } = ecc.Aes.encrypt(this.secret, toPublicKey, Buffer.from(textEncoder.encode(text)));
        const nonceString = nonce.toString();
        const messageString = message.toString('hex');
        return { 
            nonce: nonceString, 
            message: messageString, 
            checksum, 
            toPublicKey, 
            fromPublicKey: this.pub 
        };
    }

    async endToEndDecryptText(fromPublicKey, message, nonce, checksum) {
        const encryptedBuffer = Buffer.from(message, "hex");
        const decryptedBuffer = ecc.Aes.decrypt(this.secret, fromPublicKey, Long.fromString(nonce), encryptedBuffer, checksum);
        return decryptedBuffer.toString('utf8');
    }
    
    async signHash(hash256) {
        this.#requireSecret();
        return await signHash(hash256, this.secret);
    }
    
    async signText(text) {
        this.#requireSecret();
        return await signText(text, this.secret);
    }
}

export {
    KeyManager,
    KeyManagerKey,
    ecc,
    aes,
    signText,
    signHash,
    privateToPublic,
    publicKeyToString
}