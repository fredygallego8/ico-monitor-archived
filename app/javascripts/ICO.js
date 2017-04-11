import CacheAdapter from './CacheAdapter.js'
import { default as config } from './config.js'

const providers = config.icos;

class ICO{

    constructor(web3,address,  name , abi){
        this.name = name;
        this.web3 = web3;
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

    fetch(callback){
        const customArgs = this.currentIco.hasOwnProperty('customArgs')?this.currentIco.customArgs:{};
        let startBlockNumber = this.getBlockNumbers(); // start from the last block number

        let event = eval(`this.smartContract.${this.currentIco.event}`)(customArgs,{fromBlock:startBlockNumber, toBlock: 'latest'});

        event.get((error, results) => {
            if (error) {
                console.log("ERROR" , error);
                event.stopWatching();
                callback(results, error);
                return
            }
            this.blockNumbers = this.web3.eth.getTransaction(results[results.length -1].transactionHash).blockNumber;
            callback(results , null);
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
        this.blockNumbers = tx.blockNumber;
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
                value:tx.value,
                timestamp: this.web3.eth.getBlock(tx.blockNumber).timestamp
            }}
    }
}

export default ICO;
