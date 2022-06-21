const SHA256 = require('crypto-js/sha256');
const hex2ascii = require('hex2ascii');
class Block {
	constructor(data){
		this.hash = null;                                          
		this.height = 0;                                            
		this.body = Buffer.from(JSON.stringify(data), 'ascii').toString('hex'); 
		this.time = 0;                                              
		this.previousBlockHash = null;                              
    }
    validate() {
        let self = this;
		return new Promise(async (resolve, reject) => {
			const hash = self.hash;
			self.hash = await SHA256(JSON.stringify({ ...self, hash: null })).toString();
            resolve(hash === self.hash);
        });
    }
    getBData() {
		let self = this;
		return new Promise((resolve, reject) => {
			const hexEncodedStr = self.body;
			const unencryptStr = hex2ascii(hexEncodedStr);
			const unencryptObj = JSON.parse(unencryptStr);
			self.height > 0 ? resolve(unencryptObj) : reject(new Error('genesis-block'));
		});
    }
}
module.exports.Block = Block;                    