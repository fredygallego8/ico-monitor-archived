import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import { default as config } from './config.js';
import jQuery from 'jquery';

import ICO from './ICO.js';
import Dom from './DOM.js';
import CacheAdapter from './CacheAdapter.js';

const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')

let engine = new ProviderEngine();
let web3 = new Web3(engine);

// static results
engine.addProvider(new FixtureSubprovider({
    web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
    net_listening: true,
    eth_hashrate: '0x00',
    eth_mining: false,
    eth_syncing: true,
}));

// cache layer
engine.addProvider(new CacheSubprovider());

// filters
engine.addProvider(new FilterSubprovider());

// pending nonce
engine.addProvider(new NonceSubprovider());

// vm
engine.addProvider(new VmSubprovider());

// id mgmt
engine.addProvider(new HookedWalletSubprovider({
    getAccounts: function(cb){ console.log(cb) },
    approveTransaction: function(cb){ console.log(cb) },
    signTransaction: function(cb){ console.log(cb)  },
}));


// data source
engine.addProvider(new RpcSubprovider({
    rpcUrl: `${config.host}`,
}));

engine.start();

// log new blocks
engine.on('block', function(block){
    console.log('================================');
    console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'));
    console.log('================================');
});

const providers = config.icos;

const makePromise = (func) => (...args) => new Promise((resolve, fail) =>
    func(...args, (error, result) => error ? fail(error) : resolve(result))
);


/**
 * @init
 * @param ICONAME
 * this function that start the application by passing the ico name as parameter
 */
function init(ICONAME){
    /* Implementation */

    // Get ICO data from the config
    let icoConfig = providers[ICONAME];
    let dom = new Dom();

    // ICO instance
    let ico = new ICO(web3,icoConfig['address'] , ICONAME, icoConfig['abi']);

    // cache instance
    let cache = new CacheAdapter(ico);

    /**
     * Start fetching the transactions and store them into the cache if that written in the config.js
     * @todo
     * - Make the chart more dynamic to exand the period by hours
     */

    let cachedData = cache.get();
    let cachedItems = cachedData['data'];

    let fromBlock = icoConfig.hasOwnProperty('fromBlock')?icoConfig['fromBlock']:0;

    if (parseInt(cachedData.lastBlockNumber) > 0 ){
        fromBlock = parseInt(cachedData.lastBlockNumber);
    }

    let toBlock = icoConfig.hasOwnProperty('toBlock')?icoConfig['toBlock']:999999;
    let amount = config.skipBlocks;

    async function getLastTransaction(results) {
        return await makePromise(web3.eth.getTransaction)(results[results.length -1].transactionHash);
    }


    async function analyzeReadyResult(item,tx ){
        let result = ico.toJson(item, tx);

        //console.log(result);
        let etherValue = web3.fromWei(result.tx.value, "ether").valueOf();
        let sender = typeof icoConfig.args.sender !== "undefined" ? result.result.args[icoConfig.args.sender] : result.tx.from;


        const factor = icoConfig.hasOwnProperty('decimal') ? 10 ** icoConfig['decimal'] : 10 ** config['defaultDecimal'];
        let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf() / factor;

        if (parseInt(etherValue) === 0 && tokenNumbers !== 0) {
            etherValue = tokenNumbers / config['defaultEtherFactor'];
        }

        // append the csv variable that define at the top by its values
        ico.appendToCSV(sender, etherValue, tokenNumbers);

        web3.eth.getBlock(tx.blockNumber , function (err, block) {
            if(err ) return;
            //convert timestamp into date
            let txDate = new Date(block.timestamp * 1000);


            // get date with format d/m/y to be the uniqe key for the charts
            let currentDate = (txDate.getDate() + '/' + (txDate.getMonth() + 1) + '/' + txDate.getFullYear());
            if (typeof ico.chartData[currentDate] === "undefined") {
                ico.chartData[currentDate] = 0;
            }
            ico.chartData[currentDate] += 1;
            dom.append(txDate, sender, etherValue, tokenNumbers);
        });

    }

    async function analyzeResults(results) {
        results.map((item)=> {

            web3.eth.getTransaction(item.transactionHash , function (err, tx) {
                if(err) return;

                // check if the ICO is cachable?  see config.js
                if (icoConfig.hasOwnProperty('enableCache') && icoConfig.enableCache)
                    cache.save(item, tx);

                analyzeReadyResult(item , tx);
            });
        });

    }

    let transactionsCount = 0;// cachedItems.length;

    if(cachedItems.length > 0){
        transactionsCount = cachedItems.length;
        dom.transactionsCount(transactionsCount);
        console.log(cachedItems);
        cachedItems.map((item)=>analyzeReadyResult(item.result , item.tx))
    }

    let blockIterator = (from)=> {
        console.log("Inside Block",from , toBlock);

        if(from-amount > toBlock) {
            dom.loader(false);
            return
        };

        ico.fetch(from, function (error , results) {
            transactionsCount += results.length;

            dom.transactionsCount(transactionsCount);

            dom.loader(true,function () {
                if(results.length > 1){
                    analyzeResults(results);

                    getLastTransaction(results).then(function (data) {
                        from = from+amount;
                        blockIterator(from);
                    }).catch(function (err) {
                        console.log("Error" , err  , results)
                    });

                }else{ 
                    from += amount;
                    console.log("Zero Array", from);

                    blockIterator(from);

                }

            })
        });
    };

    blockIterator(fromBlock);

    dom.csvButtonOnClick(ico);
    dom.chartButtonOnClick(ico);

};


window.addEventListener('load',  ()=> {

    Object.keys(providers).forEach((address, index) => {
        jQuery('#smart-contract').append(`<option value="${address}"> ${address.toString().toUpperCase()} </option>`)
    });
    jQuery('#smart-contract').change((e)=> {
        init( e.target.value);
    });


});