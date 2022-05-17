const crypto = require('crypto');
const fs = require('fs');
const secp256k1 = require('secp256k1');
const zstd = require('zstd-lib');

class Transaction {
  static getTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  static sha256Hex(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  static hasValidUtxo(utxo) {
    const len = utxo.length;

    if (!len) {
      throw new Error('Wrong UTXO.');
    }

    for (let i = 0; i < len; i++) {
      const item = utxo[i];

      if (!Number.isInteger(item.amount) || item.amount < 1) {
        throw new Error('Wrong input amount.');
      }
    }
  }

  static signInput(params, privateKey) {
    const key = Transaction.sha256Hex(params.join(''));
    const message = secp256k1.sign(
      Buffer.from(key, 'hex'),
      Buffer.from(privateKey, 'hex')
    );
    const signature = message.signature;

    return signature.toString('hex');
  }

  static signInputs(id, inputs, privateKey) {
    try {
      for (let i = 0, length = inputs.length; i < length; i++) {
        const input = inputs[i];
        const params = [
          id,
          input.txOutIndex,
          input.txOutId,
          input.amount,
          input.address
        ];

        input.signature = Transaction.signInput(params, privateKey);
      }

      return inputs;
    } catch (error) {
      throw new Error(`Error signing inputs ${inputs}: ${error}`);
    }
  }

  constructor(type = 'regular') {
    this.type = type;
    this.txIns = [];
    this.txOuts = [];
  }

  create(utxo, recipientAddress, amount, privateKey) {
    Transaction.hasValidUtxo(utxo);

    if (!/^([0-9A-Fa-f]{64})$/.test(privateKey)) {
      throw new Error('Wrong private key.');
    }

    if (!/^([0-9A-Fa-f]{66})$/.test(recipientAddress)) {
      throw new Error('Wrong recipient address.');
    }

    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error('Wrong amount.');
    }

    const senderAddress = utxo[0].address;

    if (senderAddress === recipientAddress) {
      throw new Error('The sender address cannot match the recipient address.');
    }

    const generatedAddress = secp256k1.publicKeyCreate(Buffer.from(privateKey, 'hex'));

    if (generatedAddress.toString('hex') !== senderAddress) {
      throw new Error('Wrong pairs address/privateKey');
    }

    const totalAmount = utxo.reduce((a, b) => a + b['amount'], 0);
    const restAmount = totalAmount - amount;

    if (restAmount < 0) {
      throw new Error(
        'The sender does not have enough to pay for the transaction.'
      );
    }

    this.timestamp = Transaction.getTimestamp();
    this.txIns = utxo;
    this.txOuts = [
      {
        address: recipientAddress,
        amount
      },
      {
        address: senderAddress,
        amount: restAmount
      }
    ];

    this.sign(utxo, privateKey);

    const tx = {
      type: this.type,
      txIns: this.txIns,
      txOuts: this.txOuts,
      timestamp: this.timestamp,
      id: this.id,
    };

    return Buffer.from(JSON.stringify(tx)).toString('hex');
  }

  sign(utxo, privateKey) {
    const params = [
      this.type,
      this.timestamp,
      JSON.stringify(this.txIns),
      JSON.stringify(this.txOuts)
    ];

    this.id = Transaction.sha256Hex(params.join(''));
    this.txIns = Transaction.signInputs(this.id, utxo, privateKey);
  }

  createWithData(senderAddress, recipientAddress, data, dataHash, privateKey, token){
    this.timestamp = Transaction.getTimestamp();

    if (data) {
      if (data[0].toString() === '37' 
      && data[1].toString() === '80' 
      && data[2].toString() === '68' 
      && data[3].toString() === '70' 
      && data[4].toString() === '45') {

        data = zstd.compressSync(data, { level: 5 });
        const txData = [...data];

        this.txIns = [
          {
            address: senderAddress,
            amount: 0,
            dataHash: '',
            token: token
          }
        ];
        this.txOuts = [
          {
            address: recipientAddress,
            amount: 0,
            dataHash: '',
            data: {
              type: 'pdf',
              data: txData
            }
          }
        ];
  
        this.txOuts[0].dataHash = Transaction.sha256Hex(this.txOuts[0].data.data.join(''));
        this.txIns[0].dataHash = Transaction.sha256Hex(this.txOuts[0].data.data.join(''));
  
        this.signData(privateKey);
  
        this.txOuts[0].dataHash = '';
      } else {
        throw new Error(
          'Wrong data type.'
        );
      }
    } else {
      this.txIns = [
        {
          address: senderAddress,
          amount: 0,
          dataHash: dataHash,
          token: token,
        }
      ];
      this.txOuts = [
        {
          address: recipientAddress,
          amount: 0,
          dataHash: dataHash
        }
      ];

      this.signData(privateKey);
    }

    const tx = {
      type: this.type,
      txIns: this.txIns,
      txOuts: this.txOuts,
      timestamp: this.timestamp,
      id: this.id,
    };

    return Buffer.from(JSON.stringify(tx)).toString('hex');
  }

  signData(privateKey) {
    const outputs = JSON.stringify(this.txOuts, (key, value) => {
      if (key === 'data') {
        return undefined;
      }

      return value;
    });

    const params = [
      this.type,
      this.timestamp,
      JSON.stringify(this.txIns),
      outputs
    ];

    this.id = Transaction.sha256Hex(params.join(''));

    this.txIns = Transaction.signDataInputs(this.id, this.txIns, privateKey);
  }

  static signDataInputs(id, tx, privateKey) {
    const input = tx[0];
    const params = [
      id,
      input.amount,
      input.address,
      input.dataHash
    ];

    const key = Transaction.sha256Hex(params.join(''));
    const message = secp256k1.sign(
      Buffer.from(key, 'hex'),
      Buffer.from(privateKey, 'hex')
    );
    input.signature = message.signature.toString('hex');

    return tx;
  }
}

module.exports = Transaction;