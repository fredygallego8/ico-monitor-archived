import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import { default as config } from './config.js';
import jQuery from 'jquery';
import moment from 'moment'

import ICO from './ICO.js';
import Dom from './DOM.js';
import CacheAdapter from './CacheAdapter.js';
import math from 'mathjs'

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

let euroPerEther= 0;

jQuery.ajax({
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
    success: function(result){
        euroPerEther = result.data.rates['EUR'];
        jQuery('#time').html(new Date());
        jQuery('#ether_euro').html(euroPerEther);
    }
});

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
let blockTimestamps = {};
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
    dom.reset(ICONAME);
    jQuery('#time').html(new Date());
    jQuery('#ether_euro').html(euroPerEther);

    // ICO instance
    let ico = new ICO(web3,icoConfig['address'] , ICONAME, icoConfig['abi']);

    // cache instance
    let cache = new CacheAdapter(ico);

    /**
     * Start fetching the transactions and store them into the cache if that written in the config.js
     * @todo
     * - Make the chart more dynamic to exand the period by hours
     */

    /**
     * for statistcs
     *
     */
    let startDate = null;
    let etherTotal = 0;
    let euroTotal = 0;
    let tokenCreated = 0;
    let senders = {};
    let transactionsCount = 0;// cachedItems.length;
    let numberInvestorsMoreThanOne100kEuro = 0;
    let numberInvestorsBetween5to100kEruo= 0;
    let numberInvestorsLessThan500K= 0;
    let numberInvestorsWhoInvestedMoreThanOnce= 0;

    let maxInvestments= 0;
    let minInvestments= 99999999;
    /** end statiscs variables*/


    let cachedData = cache.get();
    let cachedItems = cachedData['data'];

    let fromBlock = icoConfig.hasOwnProperty('fromBlock')?icoConfig['fromBlock']:0;

    if (parseFloat(cachedData.lastBlockNumber) > 0 ){
        fromBlock = parseFloat(cachedData.lastBlockNumber);
    }

    let toBlock = icoConfig.hasOwnProperty('toBlock')?icoConfig['toBlock']:999999;
    let amount = config.skipBlocks;

    async function getLastTransaction(results) {
        return await makePromise(web3.eth.getTransaction)(results[results.length -1].transactionHash);
    }
    async function getBlockDetails(blockNumber) {
        let block = await makePromise(web3.eth.getBlock)(blockNumber);
        console.log(new Date(block.timestamp * 1000))
        return new Date(block.timestamp * 1000);
    }
    const memoize = func => {
        let map = {}
        return (...args) =>
            map[args] === undefined ? (map[args] = func(...args)) : map[args]
    }
    function analyzeReadyResult(item,tx ,txDate){
        let result = ico.toJson(item, tx);


        let etherValue = web3.fromWei(result.tx.value, "ether").valueOf();
        let sender = typeof icoConfig.args.sender !== "undefined" ? result.result.args[icoConfig.args.sender] : result.tx.from;

        const factor = icoConfig.hasOwnProperty('decimal') ? 10 ** icoConfig['decimal'] : 10 ** config['defaultDecimal'];
        let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf() / factor;

        if (parseFloat(etherValue) === 0 && tokenNumbers !== 0) {
            etherValue = tokenNumbers / config['defaultEtherFactor'];
        }

        if(typeof senders[sender] === "undefined")
            senders[sender] =  {tokens:0 , ethers:0 , euro:0 , times:0};

        senders[sender]['ethers'] += parseFloat(etherValue);
        senders[sender]['euro']  += parseFloat(etherValue)*parseFloat(euroPerEther) ;
        senders[sender]['tokens'] += parseFloat(tokenNumbers);
        senders[sender]['times'] += 1;


        // append the csv variable that define at the top by its values
        ico.appendToCSV(sender, etherValue, tokenNumbers);


        etherTotal += parseFloat(etherValue);
        euroTotal += parseFloat(etherValue)/euroPerEther;
        tokenCreated += parseFloat(tokenNumbers);

        dom.content('currency_raised' ,`${etherTotal} Ether` );
        dom.content('currency_raised_euro' ,`${euroTotal} ¢` );
        dom.content('tokens_created' ,`${tokenCreated} Tokens` );

        dom.content('agv_investment_currency' ,`${etherTotal/transactionsCount}` );
        dom.content('agv_investment_tokens' ,`${tokenCreated/transactionsCount}` );
        dom.content('number_of_investors' ,`${Object.keys(senders).length}` );


        // get date with format d/m/y to be the uniqe key for the charts
        let currentDate = (txDate.getDate() + '/' + (txDate.getMonth() + 1) + '/' + txDate.getFullYear());
        if (typeof ico.chartData[currentDate] === "undefined") {
            ico.chartData[currentDate] = 0;
        }
        ico.chartData[currentDate] += 1;

        /*
         * @Statistics: date for ico starts
         */
        if(!dom.content('ico_starts')){
            startDate = txDate;
            dom.content('ico_starts' ,txDate );

        }
        dom.content('ico_ends' ,txDate );

        if(startDate !== null){
            let duration = moment.duration(moment(txDate).diff(moment(startDate)));

            dom.content('duration' ,
                `
            <b>Y</b>: ${duration.get("years")}  -
              <b>M</b>: ${duration.get("months")}  -
              <b>D</b>: ${duration.get("days")}  - 
              <b>H</b>: ${duration.get("hours")}  -
              <b>I</b>: ${duration.get("minutes")}  -
              <b>S</b>: ${duration.get("seconds")}
            `
            );
        }

        for (let [key, value] of Object.entries(senders)) {
            if(value['euro'] > 100000)
                numberInvestorsMoreThanOne100kEuro+=1;
            if(value['euro'] > 5000 && value['euro'] <100000)
                numberInvestorsBetween5to100kEruo+=1;
            if(value['euro'] < 5000)
                numberInvestorsLessThan500K+=1;
            if(value['times'] > 1)
                numberInvestorsWhoInvestedMoreThanOnce +=1;
            if(value['euro'] > maxInvestments)
                maxInvestments = value['euro'];

            if(value['ethers'] < minInvestments)
                minInvestments=value['ethers'];
        }



        dom.content('investors_gk100' ,`${numberInvestorsMoreThanOne100kEuro}` );
        dom.content('investors_5100k' ,`${numberInvestorsBetween5to100kEruo}` );
        dom.content('investors_l5k' ,`${numberInvestorsLessThan500K}` );
        dom.content('investors_more_once' ,`${numberInvestorsWhoInvestedMoreThanOnce}` );
        dom.content('max_investment' ,`${maxInvestments}/${0}` );
        dom.content('min_investment' ,`${minInvestments}` );
        dom.append(txDate, sender, etherValue, tokenNumbers);

    }

    async function blockTime(blockNumber) {
        let result = await makePromise(web3.eth.getBlock)(blockNumber);
        console.log("Fetching", blockNumber)
        return new Date(result.timestamp * 1000);
    }

    async function analyzeResults(results) {
        let fastBlockTime = memoize(blockTime);
        results.map(async (item)=> {
            let blockDate = await fastBlockTime(item.blockNumber);
            console.log(blockDate);
            web3.eth.getTransaction(item.transactionHash , function (err, tx) {
                if(err) return;
                analyzeReadyResult(item , tx , blockDate);

                // check if the ICO is cachable?  see config.js
                if (icoConfig.hasOwnProperty('enableCache') && icoConfig.enableCache)
                    cache.save(item, tx);


            });

        });

    }


    if(cachedItems.length > 0){
        transactionsCount = cachedItems.length;
        dom.transactionsCount(transactionsCount);
        //console.log(cachedItems);
        cachedItems.map((item)=>analyzeReadyResult(item.result , item.tx))
    }

    let blockIterator = (from)=>{
        console.log("Inside Block",from , toBlock);

        ico.fetch(from, function (error , results) {
            transactionsCount += results.length;

            dom.transactionsCount(transactionsCount);

            dom.loader(true,function () {
                if(results.length > 1){
                    dom.loader(false);
                    dom.log(`Blocks now in memory, start analyzing them`)
                    analyzeResults(results);

                    getLastTransaction(results).then(function (data) {
                        from += amount;
                        //blockIterator(from);
                    }).catch(function (err) {
                        console.log("Error" , err  , results)
                    });

                }else{ 
                    from += config.skipBlocksOnExceptions;
                    console.log("Zero Array", from);
                    //blockIterator(from);
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