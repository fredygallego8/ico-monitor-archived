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
    getTransaction(results){

    }
    fetch(from ,toBlock ,callback){
        let self = this;
        const customArgs = this.currentIco.hasOwnProperty('customArgs')?this.currentIco.customArgs:{};

        let startBlockNumber = 	from; // start from the last block number


        let event = eval(`this.smartContract.${this.currentIco.event}`)(customArgs,{fromBlock:from, toBlock: toBlock});
        event.get((error, results) => {
            if (error && results.length === 0) {
                console.log("ERROR" , error);
                event.stopWatching();
                callback(null, error ,null , 0);
            // } else if (results.length < 1 && from < toBlock) {
            //     blockIterator(from);
            // } else if (from > toBlock){
            //     callback(results , null , "finished" , 0);
            } else {
                let promise = new Promise((resolve, reject) => {
                    try{

                        this.web3.eth.getTransaction(results[results.length -1].transactionHash, function (err, data) {
                            resolve(data);
                        });
                    }catch(err){
                        console.log(err , results ,"Error in block number", from ,this.blockNumbers);
                        reject();
                    }

                });
                promise.then(function (tx) {
                    //console.log("STEP 1");
                    self.blockNumbers = tx.blockNumber;
//                            console.log("Fetching block number", from ,self.blockNumbers);
//                            from = self.blockNumbers + amount;

                    callback(results, null, null , tx.blockNumber);
                });
            }

        });
//
//         let blockIterator = (from)=>{
//             from = from + amount;
//             let items = [];
//             let event = eval(`this.smartContract.${this.currentIco.event}`)(customArgs,{fromBlock:from, toBlock: from+amount});
//
//             event.get((error, results) => {
// //                console.log(results);
//                 if (error && results.length === 0) {
//                     console.log("ERROR" , error);
//                     event.stopWatching();
//                     callback(null, error ,null);
//                 } else if (results.length < 1 && from < toBlock) {
//                     blockIterator(from);
//                 } else if (from > toBlock){
//                     callback(items , null , "finished");
//                 } else {
//                     let promise = new Promise((resolve, reject) => {
//                         try{
//
//                             this.web3.eth.getTransaction(results[results.length -1].transactionHash, function (err, data) {
//                                 resolve(data);
//                             });
//                         }catch(err){
//                             console.log(err , results ,"Error in block number", from ,this.blockNumbers);
//                             reject();
//                         }
//
//                     });
//                     promise.then(function (tx) {
//                         //console.log("STEP 1");
//                             self.blockNumbers = tx.blockNumber;
// //                            console.log("Fetching block number", from ,self.blockNumbers);
// //                            from = self.blockNumbers + amount;
//                             items =  results;
//                             callback(items, null , null);
//
//                             console.log("STEP 2");
//                             //console.log(from);
//                             blockIterator(from);
//                     }).
//                     catch(
//                         // Log the rejection reason
//                         (reason) => {
//                             console.log('Handle rejected promise ('+reason+') here.',results);
//                             //console.log(from)
//                             blockIterator(from )
//                         });
//                 }
//             });
//         };
//
//         blockIterator(startBlockNumber-amount);

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
                timestamp: 123232//this.web3.eth.getBlock(tx.blockNumber).timestamp
            }}
    }
}

export default ICO;
