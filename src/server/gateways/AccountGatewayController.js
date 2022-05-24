import BaseGatewayController from "./BaseGatewayController";
import Account from "./Account";
import { KeyManager } from "../../KeyManager";
import { getActionCommitment } from "../../utility";

class AccountGatewayController extends BaseGatewayController {

    constructor(client) {
        super(client);
    }

    async getLoginChallenge({ username }) {
        const { accounts } = await this.getDBO();

        const existingAccount = await accounts.findOne({ usernameLower: username.toLowerCase() });
        if (!existingAccount) {
            throw new Error(`This account does not exist`);
        }

        return existingAccount.encryptedMnemonic;
    }

    async login({ nonce, signature, identityPublicKey }) {

        if (!KeyManager.isValidPublic(identityPublicKey)) throw new Error(`Invalid identity public key`);
        if (!KeyManager.verifyText(signature, await getActionCommitment({ name: "login-challenge", nonce }), identityPublicKey)) throw new Error(`Could not verify identity public key`);

        return await this.lock(async () => {

            const { accounts, oauths } = await this.getDBO();

            //
            // retrieve the account object
            //
            const { ok, value: account } = await accounts.findOneAndUpdate(
                { identityPublicKey, nonce: { $lt: nonce } },
                { $set: { nonce, lastLogin: Date.now() } },
                { returnOriginal: false }
            );

            if (!ok || !account) throw new Error(`Account could not be retrieved`);

            this.state.account = new Account(account);

            //
            // if they had logged in via oauth, we want to update their last active identity
            //
            if (this.state.oauth) {
                const { id, provider } = this.state.oauth;
                await oauths.updateOne({ id, provider }, {
                    $set: {
                        activeIdentityPublicKey: account.identityPublicKey
                    }
                });

                this.state.oauth = null;
            }

            return account;
        });
    }

    async logout() {
        this.state.account = null;
        return true;
    }

    async saveSettings({
        allowNsfw,
        blurNsfw,
        blurAllPics,
        neutralEngagement,
        likeNotifications,
        blockedTags
    }) {

        const identityPublicKey = this.identityPublicKey;
        if (!identityPublicKey) throw new Error(`You must be logged in to perform this action`);

        const { accounts } = await this.getDBO();

        await accounts.updateOne(
            { identityPublicKey },
            {
                $set: {
                    settings: {
                        allowNsfw,
                        blurNsfw,
                        blurAllPics,
                        neutralEngagement,
                        likeNotifications,
                        blockedTags
                    }
                }
            }
        )

        return true;
    }

    async recoverAccount({ encryptedMnemonic: { mnemonic, test }, publicKeys, publicKeyProofs }) {

        const [identityPublicKey, walletPublicKey] = publicKeys.split(' ');

        if (!KeyManager.isValidPublic(identityPublicKey)) throw new Error(`Invalid identity public key`);
        if (!KeyManager.isValidPublic(walletPublicKey)) throw new Error(`Invalid wallet public key`);
        if (!KeyManager.verifyText(publicKeyProofs.identity, publicKeys, identityPublicKey)) throw new Error(`Could not verify identity public key`);
        if (!KeyManager.verifyText(publicKeyProofs.wallet, publicKeys, walletPublicKey)) throw new Error(`Could not verify wallet public key`);

        const { accounts } = await this.getDBO();

        const result = await accounts.findOneAndUpdate(
            { identityPublicKey },
            {
                $set: {
                    encryptedMnemonic: { mnemonic, test },
                    walletPublicKey,
                    publicKeyProofs
                }
            }
        );

        if (!result?.value) {
            throw new Error(`An existing account to recover was not found!`);
        }

        return true;
    }
}

export default AccountGatewayController;
