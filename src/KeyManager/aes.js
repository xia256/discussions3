const crypto = require('browserify-aes');
const assert = require('assert');

// https://github.com/EOSIO/eosjs-ecc/blob/7ec577cad54e17da6168fdfb11ec2b09d6f0e7f0/src/aes.js#L114
/** This method does not use a checksum, the returned data must be validated some other way.
    @arg {string|Buffer} message - ciphertext binary format
    @arg {string<utf8>|Buffer} key - 256bit
    @arg {string<utf8>|Buffer} iv - 128bit
    @return {Buffer}
*/
function cryptoJsDecrypt(message, key, iv = ZERO_IV) {
    assert(message, "Missing cipher text")
    message = toBinaryBuffer(message)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    // decipher.setAutoPadding(true)
    message = Buffer.concat([decipher.update(message), decipher.final()])
    return message
}

// https://github.com/EOSIO/eosjs-ecc/blob/7ec577cad54e17da6168fdfb11ec2b09d6f0e7f0/src/aes.js#L131
/** This method does not use a checksum, the returned data must be validated some other way.
    @arg {string|Buffer} message - plaintext binary format
    @arg {string<utf8>|Buffer} key - 256bit
    @arg {string<utf8>|Buffer} iv - 128bit
    @return {Buffer}
*/
function cryptoJsEncrypt(message, key, iv = ZERO_IV) {
    assert(message, "Missing plain text")
    message = toBinaryBuffer(message)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    // cipher.setAutoPadding(true)
    message = Buffer.concat([cipher.update(message), cipher.final()])
    return message
}

// https://github.com/EOSIO/eosjs-ecc/blob/7ec577cad54e17da6168fdfb11ec2b09d6f0e7f0/src/aes.js#L166
const toBinaryBuffer = o => (o ? Buffer.isBuffer(o) ? o : Buffer.from(o, 'binary') : o);
const ZERO_IV = Buffer.alloc(16, 0);

export default {
    encrypt: cryptoJsEncrypt,
    decrypt: cryptoJsDecrypt
}