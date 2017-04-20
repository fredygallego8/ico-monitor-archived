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
        const customArgs = this.currentIco.hasOwnProperty('customArgs')?this.currentIco.customArgs:{};
        let amount = config.skipBlocks;
        let configToBlock = this.currentIco.toBlock;

//        let event = eval(`this.smartContract.${this.currentIco.event}`)(customArgs,{fromBlock:from, toBlock: from+amount,topics: ["LogTake"]} );
        if(typeof from === "string") {
            return;
        };

        let toBlock = configToBlock-from < 100000?'latest':from+amount;

        let event = this.smartContract[this.currentIco.event](customArgs,{fromBlock:from, toBlock: toBlock} );
//        let event = this.web3.eth.filter({fromBlock:0, toBlock: 'latest', address: this.address});

        event.get((error, results) => {

            if (error && results.length === 0) {
                console.log("ERROR", error);
                callback(error , null, null);
                return;
            }
            callback(null, results , toBlock);
        });

    }

    generateCSV(){
        let encodedUri = encodeURI(this.csvContent);
        window.open(encodedUri);
    }

    appendToCSV(...items){
        this.csvContent += items.join(",") + "\n";
    }

    toJson(block , tx = null){
        let d = {};
        d['result'] = {
            args:block.args,
            address:block.address,
            transactionHash:block.transactionHash
        };

        if(tx){
            d['tx']= {
                from: tx.from,
                    gas:tx.gas,
                    blockNumber:tx.blockNumber,
                    to:tx.to,
                    value:tx.value
            }
        }
        return d;

    }
}

export default ICO;