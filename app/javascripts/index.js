import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import { default as config } from './config.js';
import jQuery from 'jquery';
import moment from 'moment'

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

let currencyPerEther= {};

jQuery.ajax({
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
    success: function(result){
        console.log(result.data)
        config.supportedCurrencies.map(function (currency) {
            jQuery('#currency-selector').append(`<option value="${result.data.rates[currency]}">${currency}</option>`);
        });
        currencyPerEther = {name: 'EUR', value:result.data.rates['EUR']};
        jQuery('#time').html(new Date());
        jQuery('#ether_euro').html(currencyPerEther.value);

        jQuery('.currency').each(function(){
            jQuery(this).html(currencyPerEther.name);
        });

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

const makePromise = (func) => (...args) => new Promise((resolve, fail) =>
    func(...args, (error, result) => error ? fail(error) : resolve(result))
);

const memoize = func => {
    const data = CacheAdapter.getBlock()
    let map = data?data:{};
    return (...args) =>
        map[args] === undefined ? (map[args] = func(...args)) : map[args];
};

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

let dom = new Dom();

function refreshResults(){

    maxInvestments= 0;
    minInvestments= 99999999;
    numberInvestorsMoreThanOne100kEuro = 0;
    numberInvestorsBetween5to100kEruo= 0;
    numberInvestorsLessThan500K= 0;
    numberInvestorsWhoInvestedMoreThanOnce= 0;

    dom.content('currency_raised_euro' ,`${etherTotal*currencyPerEther.value} ${currencyPerEther.name}` );

    for (let [key, value] of Object.entries(senders)) {
        let currencyValue = value['ethers']*currencyPerEther.value;

        if(currencyValue > 100000)
            numberInvestorsMoreThanOne100kEuro+=1;
        if(currencyValue > 5000 && currencyValue <100000)
            numberInvestorsBetween5to100kEruo+=1;
        if(currencyValue < 5000)
            numberInvestorsLessThan500K+=1;
        if(value['times'] > 1)
            numberInvestorsWhoInvestedMoreThanOnce +=1;

        if(currencyValue > maxInvestments)
            maxInvestments = `${currencyValue} ${currencyPerEther.name}  / ${value['ethers']} Ether`;

        if(value['ethers'] < minInvestments)
            minInvestments=value['ethers'];
    }



    dom.content('investors_gk100' ,`${numberInvestorsMoreThanOne100kEuro}` );
    dom.content('investors_5100k' ,`${numberInvestorsBetween5to100kEruo}` );
    dom.content('investors_l5k' ,`${numberInvestorsLessThan500K}` );
    dom.content('investors_more_once' ,`${numberInvestorsWhoInvestedMoreThanOnce}` );
    dom.content('max_investment' ,`${maxInvestments}` );
    dom.content('min_investment' ,`${minInvestments}` );

}


/**
 * @init
 * @param ICONAME
 * this function that start the application by passing the ico name as parameter
 */
function init(ICONAME){
    /* Implementation */

    // Get ICO data from the config
    let icoConfig = providers[ICONAME];

    dom.reset(ICONAME);
    jQuery('#time').html(new Date());
    jQuery('#ether_euro').html(currencyPerEther.value);

    // ICO instance
    let ico = new ICO(web3,icoConfig['address'] , ICONAME, icoConfig['abi']);

    // cache instance
    let cache = new CacheAdapter(ico);

    let storageData = [];

    /**
     * Start fetching the transactions and store them into the cache if that written in the config.js
     * @todo
     * - Make the chart more dynamic to exand the period by hours
     */

    /**
     * for statistcs
     *
     */
    startDate = null;
    etherTotal = 0;
    euroTotal = 0;
    tokenCreated = 0;
    senders = {};
    transactionsCount = 0;// cachedItems.length;

    /** end statiscs variables*/

    let cachedData = cache.get();
    let cachedItems = cachedData['data'];

    let fromBlock = icoConfig.hasOwnProperty('fromBlock')?icoConfig['fromBlock']:0;

    if (parseFloat(cachedData.lastBlockNumber) > 0 ){
        fromBlock = parseFloat(cachedData.lastBlockNumber);
    }

    let toBlock = icoConfig.hasOwnProperty('toBlock')?icoConfig['toBlock']:999999;

    async function analyzeReadyResult(item){
        let fastBlockTime = memoize(blockTime);
        let txDate = await fastBlockTime(item.blockNumber);

        let dates = CacheAdapter.getBlock() //JSON.parse(localStorage.getItem('blockTimes'));
        dates[item.blockNumber] = txDate;
        localStorage.setItem('blockTimes',JSON.stringify(dates));

        if(typeof txDate === "string")
            txDate = new Date(txDate);


//        console.log(`Analyzing ${item.blockNumber}`);

        let result = ico.toJson(item);
        console.log(`Analyzing ${item.blockNumber}`);
        const factor = icoConfig.hasOwnProperty('decimal') ? 10 ** icoConfig['decimal'] : 10 ** config['defaultDecimal'];
        let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf() / factor;

        let etherValue = tokenNumbers/icoConfig['etherFactor']; //web3.fromWei(result.tx.value, "ether").valueOf();
        let sender = result.result.args[icoConfig.args.sender];

        if (parseFloat(etherValue) === 0 && tokenNumbers !== 0) {
            etherValue = tokenNumbers / config['defaultEtherFactor'];
        }

        if(typeof senders[sender] === "undefined")
            senders[sender] =  {tokens:0 , ethers:0 , euro:0 , times:0};

        senders[sender]['ethers'] += parseFloat(etherValue);
        senders[sender]['tokens'] += parseFloat(tokenNumbers);
        senders[sender]['times'] += 1;
        
        // append the csv variable that define at the top by its values
        ico.appendToCSV(sender, etherValue, tokenNumbers);


        etherTotal += parseFloat(etherValue);
        tokenCreated += parseFloat(tokenNumbers);


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
        //dom.append(txDate, sender, etherValue, tokenNumbers);
        return txDate;
    }

    async function blockTime(blockNumber) {
        let result = await makePromise(web3.eth.getBlock)(blockNumber);
        console.log(`Caching this timestamp form block number blockNumber ${blockNumber}`);
        dom.log(`Fetching ${blockNumber} timestamp`);
        return new Date(result.timestamp * 1000);
    }


    async function analyzeResults(results) {
        let txDate = null;
        for ( let i = 0,j=results.length-1; i < results.length/2 ; i++ , j--){
            let item = results[i];

            txDate = await analyzeReadyResult(item);

        }

        dom.content('currency_raised' ,`${etherTotal} Ether` );
        dom.content('tokens_created' ,`${tokenCreated} Tokens` );

        dom.content('agv_investment_currency' ,`${etherTotal/transactionsCount}` );
        dom.content('agv_investment_tokens' ,`${tokenCreated/transactionsCount}` );
        dom.content('number_of_investors' ,`${Object.keys(senders).length}` );

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


        refreshResults()

        dom.log(`Enjoy the statistics`);
        dom.loader(false)
    }


    if(cachedItems.length > 0){
        transactionsCount = cachedItems.length;
        dom.transactionsCount(transactionsCount);
        //console.log(cachedItems);
        cachedItems.map((item)=>analyzeReadyResult(item.result , item.tx))
    }

    let blockIterator = (from)=>{
        console.log("Inside Block",from , toBlock);

        ico.fetch(from, function (error , results, to) {
            console.log("Count of results",results.length , `Period: ${from}:${to}`)
            transactionsCount += results.length;

            dom.transactionsCount(transactionsCount);
            if(from > toBlock || to === "latest"){
                dom.loader(false);
                console.log(`Finished fetching data from ${config.host} node`);
                storageData= storageData.concat(results);

                const sl = storageData.length;
                dom.log(`Start analysing them ${sl} item ..`);
                if (sl > 1000 && sl < 5000)
                    dom.log(`Please wait few seconds...`);
                else if (sl > 5000 && sl < 100000)
                    dom.log(`Please wait few minutes...`);
                else
                    dom.log(`Please wait, it will take at least 5 minutes ...`);

                dom.loader(true,function(){
                    analyzeResults(storageData);
                });

                console.log("After storage")
            }else {

                dom.loader(true, function () {
                    if (results.length > 1) {
                        storageData = storageData.concat(results);
                        dom.log(`Blocks now in memory From: ${from}- To: ${to}`);
                        from = to;
                        blockIterator(from);

                    } else {
                        from += config.skipBlocksOnExceptions;
                        console.log("Zero Array", from);
                        blockIterator(from);
                    }

                });
            }
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

    jQuery('body').on('change' , '#currency-selector' , (e)=> {
        currencyPerEther = {name: jQuery('#currency-selector option:selected').text() , value:e.target.value };
        jQuery('#time').html(new Date());
        jQuery('#ether_euro').html(currencyPerEther.value);

        jQuery('.currency').each(function(){
            jQuery(this).html(currencyPerEther.name);
        });

        refreshResults()
    });

});