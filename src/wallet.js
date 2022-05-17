const request = require('request-promise-native');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

const Transaction = require('./transaction');

class Wallet {
  static generateKeyPair() {
    const privateKey = crypto.randomBytes(32);
    const address = secp256k1.publicKeyCreate(privateKey);

    return {
      privateKey: privateKey.toString('hex'),
      address: address.toString('hex')
    };
  }

  constructor(url) {
    this.url = url;
  }

  getTokenForDataCreation(address, privateKey, expirationTime) {
    const params = [
      address,
      expirationTime
    ];

    const key = Transaction.sha256Hex(params.join(''));
    const message = secp256k1.sign(
      Buffer.from(key, 'hex'),
      Buffer.from(privateKey, 'hex')
    );

    const signature = message.signature.toString('hex');

    const options = {
      method: 'POST',
      url: `${this.url}/address/${address}/createToken`,
      json: {signature, expirationTime},
      resolveWithFullResponse: true
    }
    return request(options)

  }

  sendTransaction(txHex) {
    return request({
      method: 'POST',
      uri: `${this.url}/transaction/send`,
      json: {txHex}
    });
  }

  getUnspent(address) {
    return request({
      method: 'GET',
      uri: `${this.url}/address/${address}/unspent`,
      json: true
    });
  }
}

module.exports = Wallet;