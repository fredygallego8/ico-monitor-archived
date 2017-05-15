import CacheAdapter from './CacheAdapter.js'
import { default as config } from './config.js'
import 'babel-polyfill';

const providers = config.icos;



//let tx = await makePromise(web3.eth.getTransaction)('latest');


class ICO{

    constructor(web3,address,  name , abi){
        this.name = name;
        this.web3 = web3;
        this.address = address;
        this.smartContract = this.web3.eth.contract(abi).at(address);
        this.currentIco = providers[name];
        this.current = new CacheAdapter(this).get();

        this.blockNumbers = this.current.lastBlockNumber;
        this.csvContent = "data:text/csv;charset=utf-8,";
        this.csvContent += ["Transaction Maker", "Value in Eth", "Number of token"].join(",") + "\n";
        this.chartData = {};

    }
    getBlockNumbers(){
        return this.blockNumbers;
    }
    getTransaction(results){

    }
    fetch(from  ,callback){
        let self = this;
        const customArgs = this.currentIco.hasOwnProperty('customArgs')?this.currentIco.customArgs:{};
        let amount = config.skipBlocks;

//        let event = eval(`this.smartContract.${this.currentIco.event}`)(customArgs,{fromBlock:from, toBlock: from+amount,topics: ["LogTake"]} );
        let event = this.smartContract[this.currentIco.event](customArgs,{fromBlock:0, toBlock: 'latest'} );
//        let event = this.web3.eth.filter({fromBlock:0, toBlock: 'latest', address: this.address});

        event.get((error, results) => {

            if (error && results.length === 0) {
                console.log("ERROR", error);
                callback(error , null, null);
                return;
            }
            callback(null, results);
        });

    }

    generateCSV(){
        let encodedUri = encodeURI(this.csvContent);
        window.open(encodedUri);
    }

    appendToCSV(...items){
        this.csvContent += items.join(",") + "\n";
    }

    toJson(block , tx){
        return {
            'result': {
                args:block.args,
                address:block.address,
                transactionHash:block.transactionHash
            },
            'tx': {
                from:tx.from,
                gas:tx.gas,
                blockNumber:tx.blockNumber,
                to:tx.to,
                value:tx.value
            }}
    }
}

export default ICO;