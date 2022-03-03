import axios from "axios";
import { Api, JsonRpc } from "eosjs";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import fetch from "node-fetch";

import { tryParseJson } from "../../utility";

import ServerConfig from "../server.config";
import BaseGatewayController from "./BaseGatewayController";

async function transact(chain, actions) {

    let chainConfig = undefined;
    if (chain == 'EOS') chainConfig = ServerConfig.crypto.eos;
    else if (chain == 'TLOS') chainConfig = ServerConfig.crypto.tlos;

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

function addAuthorization(actions) {
    return actions.map(a => ({
        ...a,
        authorization: [{
            actor: ServerConfig.crypto.eos.relayAccount,
            permission: ServerConfig.crypto.eos.relayPermission,
        }]
    }));
}

class CryptoGatewayController extends BaseGatewayController {
    constructor(client) {
        super(client);
    }

    async tickers() {
        // TO-DO: 5 minute cache result...

        // {"last":"0.000000262","low":"0.000000262","high":"0.000000262","change":"0","base_volume":"889.6641","quote_volume":"0.0002330919942","market_id":"ATMOS-BTC","time":"2021-06-09T19:54:31.000Z"}
        const { data: { data: probit } } = await axios.get('https://api.probit.com/api/exchange/v1/ticker');
        // {"symbol":"TLOS-USDT","symbolName":"TLOS-USDT","buy":"0.22674","sell":"0.22793","changeRate":"0.1096","changePrice":"0.0224","high":"0.2446","low":"0.2","vol":"1422116.17381989","volValue":"317006.8972699623789","last":"0.22675","averagePrice":"0.21920268","takerFeeRate":"0.001","makerFeeRate":"0.001","takerCoefficient":"2","makerCoefficient":"2"}
        const { data: { data: { ticker: kucoin } } } = await axios.get('https://api.kucoin.com/api/v1/market/allTickers');

        const kucoinTicker = (t) => ({ last: t.last, change: t.changeRate, symbol: t.symbol.split('-')[0] });
        const probitTicker = (t) => ({ last: t.last, change: t.change, symbol: t.market_id.split('-')[0] });

        const atmos_btc = probitTicker(probit.find(t => t.market_id == "ATMOS-BTC"));
        const eos_usd = kucoinTicker(kucoin.find(t => t.symbol == "EOS-USDT"))
        const tlos_usd = kucoinTicker(kucoin.find(t => t.symbol == "TLOS-USDT"))
        const btc_usd = kucoinTicker(kucoin.find(t => t.symbol == "BTC-USDC"));

        const result = [
            eos_usd,
            tlos_usd,
            btc_usd,
            { ...atmos_btc, last: atmos_btc.last * btc_usd.last } // atmos/usd
        ];

        return result;
    }

    async transfer({ chain, actions }) {

        const { posts } = await this.getDBO();

        let txActions = [];

        for (const action of actions) {
            txActions.push({
                account: `nsuidcntract`,
                name: `transfer`,
                data: {
                    ...action,
                    relayer_account: ServerConfig.crypto.eos.relayAccount,
                    relayer: ServerConfig.crypto.eos.relayPublicKey
                }
            })
        }

        txActions = addAuthorization(txActions);

        const trx = await transact(chain, txActions);

        const tips = actions
            .map(t => ({ ...t, metadata: tryParseJson(t.metadata), txid: trx.transaction_id }))
            .filter(t => t.metadata?.type == "tip" && t.metadata?.parentPostId);

        for (const tip of tips) {
            await posts.updateOne(
                {
                    id: tip.metadata.parentPostId,
                    identityPublicKey: tip.metadata.recipientIdentity
                }, {
                $push: {
                    tips: { $each: [tip] }
                }
            });
        }

        return trx;
    }
}

export default CryptoGatewayController;