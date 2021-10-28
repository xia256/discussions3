//
// source of truth module seeks to publish data to a public blockchain to be used to
// independently restore a copy of the state database
//

import { Api, JsonRpc } from "eosjs";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import fetch from "node-fetch";

const PUBLISH_FREQUENCY = 1000 * 2;
const ACTION_BATCH_SIZE = 100;

import { tryConnectDatabase, getDatabase } from '../mongodb';
import ServerConfig from '../server.config';
import { delay } from '../../utility';

(async function () {

    if (!await tryConnectDatabase((ex) => console.error(ex))) {
        return;
    }
    else {
        console.log(`Connected to mongodb at ${ServerConfig.mongodb.connection}`);
    }

    const database = await getDatabase();
    const actionsCollection = database.collection(ServerConfig.mongodb.collections.actions);

    for (; ;) {
        const actions = (await actionsCollection
            .find({ $or: [ { txid: { $exists: false } }, { txid: '' }] })
            .sort({ _id: 1 })
            .limit(ACTION_BATCH_SIZE)
            .toArray());

        if (actions.length > 0) {
            const actionIds = actions.map(o => o._id);

            let txActions = [];
            txActions.push({
                authorization: [{
                    actor: ServerConfig.crypto.tlos.relayAccount,
                    permission: ServerConfig.crypto.tlos.relayPermission,
                }],
                account: `discussionsx`,
                name: `notify`,
                data: {
                    metadata: JSON.stringify({
                        type: 'discussions3',
                        actions: actions.map(o => (delete o['_id'], o))
                    })
                }
            });

            const trx = await transact(txActions);

            await actionsCollection.updateMany({ _id: { $in: actionIds } }, {
                $set: {
                    txid: trx.transaction_id
                }
            });

            console.log(`Wrote action batch size of ${actions.length} as ${trx.transaction_id} at ${new Date().toLocaleString()}`);
        }

        await delay(PUBLISH_FREQUENCY);
    }

})();

// from CryptoGatewayController.js

async function transact(actions) {

    let chainConfig = ServerConfig.crypto.tlos;

    if (!chainConfig) throw new Error(`Could not determine RPC for ${chain}`);

    const signatureProvider = new JsSignatureProvider([chainConfig.relayKey]);

    const api = new Api({
        rpc: new JsonRpc(chainConfig.rpc, { fetch }),
        signatureProvider,
        textDecoder: new TextDecoder(),
        textEncoder: new TextEncoder(),
    });

    let trx = await api.transact({ actions }, {
        blocksBehind: 3,
        expireSeconds: 60
    });

    return trx;
}