import { Api, JsonRpc } from "eosjs";
import ecc from "eosjs-ecc";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";

import { mapState, mapGetters } from "vuex";
import { delay, isVisible, generateUUID, Mutex } from "../utility";

import { KeyManager } from "../KeyManager";
import { UnifiedIdTransfer } from "../KeyManager/UnifiedIdTransfer";

import api from "../server/api";
import { PostObject } from "../server/api/objects";
import ServerConfig from "../server/api/config.json";

export default {
    data: () => ({
        waiting: false,
    }),
    watch: {
    },
    computed: {
        ...mapState(["keyManager", "account", "settings"]),
        ...mapGetters(["isLoggedIn"]),
        selfIdentityKey() {
            if (!this.keyManager) return undefined;
            const identityKey = this.keyManager.keys['identity'];
            return identityKey;
        },
        selfIdentityPublicKey() {
            return this.selfIdentityKey?.pub;
        },
        selfWalletPublicKey() {
            if (!this.keyManager) return undefined;
            const walletKey = this.keyManager.keys['wallet'];
            return walletKey?.pub;
        },
        //Function to detect if the user is a global moderator.
        isGlobalModerator() {
            return this.selfIdentityPublicKey ? ServerConfig.globalModerators.includes(this.selfIdentityPublicKey) : false;
        },
        isOEmbed() {
            return this.$route.query.oembed ? true : false;
        },
        is4K() {
            return this.$vuetify.breakpoint.xlOnly;
        },
        isMDPI() {
            return this.$vuetify.breakpoint.lgOnly && this.$vuetify.breakpoint.width < 1440;
        },
        isMobile() {
            return this.$vuetify.breakpoint.mobile;
        },
        isSafari() {
            if (
                navigator.userAgent.match(/safari/i) &&
                !navigator.userAgent.match(/chrome/i)
            ) {
                return true;
            }
            return false;
        },
        isIOS() {
            return [
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
                // iPad on iOS 13 detection
                || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
        }
    },
    async created() {
        this.$mutex = new Mutex();
        this.$mutexId = Mutex.createId();
    },
    async mounted() {
    },
    methods: {
        log(message, ...optionalParameters) {
            console.log(message, ...optionalParameters);
        },
        async wait(callbackAsync) {
            return this.$mutex.lock(this.$mutexId, async () => {
                try {
                    this.waiting = true;
                    return await callbackAsync();
                }
                finally {
                    this.waiting = false;
                }
            });
        },
        async waitForLoginFinish() {
            while (this.isLoggedIn == 1) {
                await delay(5);
            }
        },
        openOAuthPopup(provider) {
            const apiServer = ServerConfig.url;
            window.open(
                `${apiServer}/api/v1/account/passport/${provider}?clientId=${api.clientId}&redirect=${window.location.origin}/popup`
            );
        },
        getPasswordInput(options = {}) {
            return new Promise((resolve, reject) => {
                this.openDialog('password', {
                    ...options,
                    continueCallback: async ({ password, encryptedMnemonic }) => {
                        try {
                            const keyManager = await KeyManager.decrypt(password, encryptedMnemonic);
                            resolve({ password, encryptedMnemonic, keyManager });
                        }
                        catch (ex) {
                            reject(new Error(`Invalid password`));
                        }
                    }
                });
            });
        },
        openDialog(name, options = {}) {
            this.$store.commit('setDialog', [name, options]);
        },
        closeDialog(name) {
            this.$store.commit('setDialog', [name, null]);
        },
        openProfilePopover({ target }, username) {
            this.openPopover(
                "profile",
                { $el: target },
                { username: username }
            );
        },
        openPopover(name, { $el, rx, ry } = {}, options = {}) {
            const defaultOptions = {
                debounce: 250
            };

            options = {
                ...defaultOptions,
                ...options
            };

            if (options.debounce > 0 && !$el) {
                throw new Error(`Popover ${name} attempted to open but $el was not specified`);
            }

            const setPopover = () => {
                if ($el && !isVisible($el)) return;

                let x = options.x;
                let y = options.y;

                if (x == undefined || y == undefined) {
                    const rect = $el.getBoundingClientRect();
                    x = rect.x + rect.width + (rx ?? 10);
                    y = rect.y + (ry ?? (-10));
                }

                this.$store.commit('setPopover', [name, { ...options, x, y, id: generateUUID(), $el }]);
            }

            if (options.debounce > 0) {
                const timeout = setTimeout(() => setPopover(), options.debounce);

                const mouseExit = () => {
                    clearTimeout(timeout);
                    $el.removeEventListener('mouseleave', mouseExit);
                };

                $el.addEventListener('mouseleave', mouseExit);
            }
            else {
                setPopover();
            }
        },
        closePopover(name) {
            this.$store.commit('setPopover', [name, null]);
        },
        openThread(post) {
            const username = post.username;
            const encodedId = post.getEncodedId();
            const title = post.title;

            // we're already on a thread page
            if (this.$route.name == "viewpost") {
                const link = PostObject.link(username, encodedId, title);
                this.$router.push(link).catch(() => { }); // redundant navigation
                return;
            }

            this.openDialog('thread', { username, encodedId, title });
        },
        requireLoginDialog() {
            if (!this.isLoggedIn) {
                this.openDialog('login');
                return true;
            }
            return false;
        },
        //%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        //                          MODERATION TOOLS
        //%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        subscribe2Mod(){

        },
        unsubscribe2Mod(){

        },
        
        //%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        //
        // cryptocurrency common
        //
        transactionUrl(chain, trxId) {
            let url = '';
            if (chain == 'EOS') url = `https://bloks.io/transaction/${trxId}`;
            else if (chain == 'TLOS') url = `https://telos.bloks.io/transaction/${trxId}`;
            return url;
        },
        getToken(symbol) {
            return ServerConfig.crypto.tokens.find(t => t.symbol == symbol);
        },
        async getEosioApi(chain) {
            let rpc = undefined;
            if (chain == "EOS") rpc = ServerConfig.crypto.eos.rpc;
            else if (chain == "TLOS") rpc = ServerConfig.crypto.tlos.rpc;

            if (!rpc) throw new Error(`Unknown RPC for chain ${chain}`);

            const signatureProvider = new JsSignatureProvider([]);
            const jsonRpc = new JsonRpc(rpc, {});
            const api = new Api({
                rpc: jsonRpc,
                signatureProvider,
                textDecoder: new TextDecoder(),
                textEncoder: new TextEncoder(),
            });
            return api;
        },
        async createAsset(quantity, symbol) {
            let token = ServerConfig.crypto.tokens.find(t => t.symbol == symbol);
            let precision = token?.precision ?? 4;

            let quantityStr = Math.floor(quantity * Math.pow(10, precision)).toString();
            let decimalIdx = quantityStr.length - precision;

            let result = '';
            if (decimalIdx <= 0) {
                result = '0.';
                while (decimalIdx++ < 0) result += '0';
                result += quantityStr;
            }
            else {
                result = quantityStr.slice(0, decimalIdx) + '.' + quantityStr.slice(decimalIdx);
            }

            return `${result} ${symbol}`;
        },
        async signTransfers(transferData, parentPostId) {
            const transfers = {};
            if (transferData && transferData.length > 0) {
                const { keyManager } = await this.getPasswordInput({
                    transfers: transferData,
                });
                const walletKey = keyManager.keys["wallet"];

                const nonce = Date.now();
                for (let i = 0; i < transferData.length; i++) {
                    console.log(`Signing ${i + 1} of ${transferData.length} transfers...`);
                    const t = transferData[i];
                    const transfer = new UnifiedIdTransfer({
                        chain: 0,
                        recipientPublicKey: new ecc.PublicKey(
                            t.recipient.walletPublicKey
                        ).toString(),
                        amount: t.amount,
                        fee: await this.createAsset(0, t.symbol),
                        nonce: nonce + i,
                        metadata: JSON.stringify({
                            type: "tip",
                            parentPostId: parentPostId,
                            recipientIdentity: t.recipient.identityPublicKey,
                        }),
                    });

                    const _token = this.getToken(t.symbol);
                    const _transfers =
                        transfers[_token.chain] ?? (transfers[_token.chain] = []);
                    _transfers.push(await transfer.sign(walletKey));
                }
            }
            return transfers;
        }
    }
};
