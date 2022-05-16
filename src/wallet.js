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

  getSignatureForTokenCreation(address, privateKey) {
    const timestamp = Transaction.getTimestamp();

    const params = [
      address,
      timestamp
    ];

    const key = Transaction.sha256Hex(params.join(''));
    const message = secp256k1.sign(
      Buffer.from(key, 'hex'),
      Buffer.from(privateKey, 'hex')
    );

    const signature = message.signature.toString('hex');

    request({
      method: 'POST',
      url: `${this.url}/address/${address}/createToken`,
      json: {signature}
    })
      .then(res => {
        return res.token;
      })
      .catch(err => {
        throw new Error(err);
      })
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