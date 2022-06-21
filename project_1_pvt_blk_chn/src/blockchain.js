const hex2ascii = require('hex2ascii');
const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
class Blockchain {
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let height = self.chain.length;
            block.previousBlockHash = self.chain[height - 1] ? self.chain[height - 1].hash : null;
            block.height = height;
            block.time = new Date().getTime().toString().slice(0,-3);
            block.hash = await SHA256(JSON.stringify(block)).toString();
			const blockValid = block.hash && (block.hash.length === 64) && (block.height === self.chain.length) && block.time;
            blockValid ? resolve(block) : reject(new Error('Cannot add invalid block.'));
        })
        .catch(error => console.log('[ERROR] ', error)) 
        .then(block => {
            this.chain.push(block);
            this.height = this.chain.length - 1;
            return block;
        });
    }
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            let unsignedMessage = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
            resolve(unsignedMessage);
        });
    }


    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let requestTime = parseInt(message.split(':')[1]);
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
			const spendTime = (currentTime - requestTime);
            if (spendTime >= (5 * 60)) reject(new Error('Request timed out.'));
            if (!bitcoinMessage.verify(message, address, signature)) reject(new Error('Invalid-message'));
            let block = new BlockClass.Block({ star });
            block.owner = address;
            block = await self._addBlock(block)
            resolve(block);             
        });
    }
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           resolve(self.chain.filter(block => block.hash === hash)[0]);
        });
    }
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            block ? resolve(block) : resolve(null);
        });
    }
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        this.validateChain().then(errors => typeof errors === 'string' ?  console.log('[SUCCESS] ', errors) : errors.forEach(error => console.log('[ERROR] ', error)));
        return new Promise(async (resolve, reject) => {
            let ownedBlocks = self.chain.filter(block => block.owner === address);
            if (ownedBlocks.length === 0) reject(new Error('Address not found.'));
            stars = ownedBlocks.map(block => JSON.parse(hex2ascii(block.body)));
            stars ? resolve(stars) : reject(new Error('Failed to return stars.'));
        });
    }
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            for (let block of self.chain) {
                if (await block.validate()) {
                    if (block.height > 0) { // skip genesis block
                        let prevBlock = self.chain.filter(b => b.height === block.height - 1)[0];
                        if (block.previousBlockHash !== prevBlock.hash) {
                            errorLog.push(new Error(`Invalid link:- Block #${block.height} not linked to the hash of block #${block.height - 1}.`));
                        }
                    }
                } else {
                    errorLog.push(new Error(`Invalid block #${block.height}: ${block.hash}`))
                }
            }
            errorLog.length > 0 ? resolve(errorLog) : resolve('No errors detected.');
        });
    }

}

module.exports.Blockchain = Blockchain;   