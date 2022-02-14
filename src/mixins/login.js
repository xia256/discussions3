import api from "../server/api";
import { getActionCommitment } from "../utility";

export default {
    methods: {
        async login(keyManager) {
            keyManager.redact();

            const nonce = Date.now();
            const identityKey = keyManager.keys['identity'];

            if (!identityKey) return null;

            console.log(`Attempting login as ${identityKey.pub}`);

            let account = undefined;
            try {
                account = await api.Account.login({
                    nonce: nonce,
                    signature: await identityKey.signText(await getActionCommitment({ name: "login-challenge", nonce })),
                    identityPublicKey: identityKey.pub
                });
            }
            catch (ex) {
                console.log(ex);
                await this.logout();
                return null;
            }

            // commit the account to state
            this.$store.commit('set', ['keyManager', keyManager]);
            this.$store.commit('setAccount', account);

            console.log(`Logged in as ${identityKey.pub} ${account.username}`);

            return { nonce, account, keyManager };
        },
        async logout() {
            await api.Account.logout();
            this.$store.commit('logout');
        }
    }
};