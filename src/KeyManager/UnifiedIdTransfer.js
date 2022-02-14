import BufferWriter from "./BufferWriter";
import ecc from 'eosjs-ecc';

export class UnifiedIdTransfer {
    static get WithdrawalPublicKey() { return `EOS1111111111111111111111111111111114T1Anm`; }

    constructor({
        chain,
        recipientPublicKey,
        recipientAccount,
        amount,
        fee,
        nonce,
        memo,
        metadata
    }) {
        this.chain = chain;
        this.senderPublicKey = '';
        this.recipientPublicKey = recipientPublicKey;
        this.amount = amount;
        this.fee = fee;
        this.nonce = nonce;
        this.memo = memo;
        this.memo2 = '';
        this.metadata = metadata;

        if (recipientAccount) {
            this.recipientPublicKey = UnifiedIdTransfer.WithdrawalPublicKey;
            this.memo2 = `${recipientAccount}:${this.memo ?? ''}`;
        }
    }

    async sign(senderKey) {
        const body = new BufferWriter();
        body.writeUInt64(this.chain);
        body.writePublicKey(new ecc.PublicKey(senderKey.pub).toString(), 'EOS'); // convert to legacy format
        body.writePublicKey(this.recipientPublicKey, 'EOS');
        body.writeAsset(this.amount);
        body.writeAsset(this.fee);
        body.writeUInt64(this.nonce);
        body.writeString(this.memo2 ?? '');

        const bodyBuffer = body.toBuffer();

        const header = new BufferWriter();
        header.writeByte(0x03); // version
        header.writeByte(bodyBuffer.length + 2); // length

        const headerBuffer = header.toBuffer();

        let trx = new BufferWriter();
        trx.write(headerBuffer);
        trx.write(bodyBuffer);

        const trxBuffer = trx.toBuffer();
        const signature = await senderKey.signHash(ecc.sha256(trxBuffer, 'hex'));

        // memo is stored in metadata to by pass ~170ch limit
        if (this.memo) {
            if (this.metadata) {
                this.metadata = JSON.stringify({
                    ...JSON.parse(this.metadata),
                    memo: this.memo
                });
            }
            else {
                this.metadata = JSON.stringify({ memo: this.memo });
            }
        }

        return {
            chain_id: this.chain,
            from: senderKey.pub,
            to: this.recipientPublicKey,
            amount: this.amount,
            fee: this.fee,
            nonce: this.nonce,
            memo: this.memo2 ?? '',
            sig: signature,
            metadata: this.metadata ?? ''
        };
    }
}