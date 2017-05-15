import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import { default as config } from './config.js';
import jQuery from 'jquery';
import Chart from 'chart.js';
import ICO from './ICO.js';
import CacheAdapter from './CacheAdapter.js';

const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')

var engine = new ProviderEngine();
let web3 = new Web3(engine);
//new Web3.providers.HttpProvider("http://localhost:8545")

// static results
engine.addProvider(new FixtureSubprovider({
    web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
    net_listening: true,
    eth_hashrate: '0x00',
    eth_mining: false,
    eth_syncing: true,
}));

// cache layer
engine.addProvider(new CacheSubprovider())

// filters
engine.addProvider(new FilterSubprovider())

// pending nonce
engine.addProvider(new NonceSubprovider())

// vm
engine.addProvider(new VmSubprovider())

// id mgmt
engine.addProvider(new HookedWalletSubprovider({
    getAccounts: function(cb){ console.log(cb) },
    approveTransaction: function(cb){ console.log(cb) },
    signTransaction: function(cb){ console.log(cb)  },
}));



// data source
engine.addProvider(new RpcSubprovider({
    rpcUrl: 'http://localhost:8545',
    //rpcUrl: 'https://mainnet.infura.io/My9Aw8U1yEqmchLYRKXK',
}));

engine.start();

// log new blocks
engine.on('block', function(block){
    console.log('================================')
    console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'))
    console.log('================================')
});


//web3.setProvider(new web3.providers.HttpProvider(`${config.host}`))
const providers = config.icos;

/**
 * This class to handle any thing retalted the DOM.
 * @Dom
 * @append : tot add the transactions on the table
 * @transactionsCount: change the transactions count
 * @loader: toggle the spin that comes before loading any data.
 */
class Dom{
    constructor(){
        console.log("Dom start" , providers);
        this.chart = new ChartManeger();
    }

    append(...data){
        if(jQuery("#data .body").length > 100)
            jQuery('#data .body').html("");

        let transaction =`<ul> ${data.map((result)=>`<li>${result}</li>`)}</ul>`;

        jQuery('#data .body').prepend(transaction);
    };

    transactionsCount(number){
        let n = parseInt( jQuery('#transaction_number').html())+number;
        jQuery('#transaction_number').html(n);
    }

    loader(status = false,callback){
        status?jQuery('#loader').show(callback):jQuery('.uil-pie-css').hide(callback);
    }
    csvButtonOnClick(ico){
        jQuery('#download_csv').click(function () {
            ico.generateCSV();
        });
    }

    chartButtonOnClick(ico){
        let chart = new ChartManeger();
        jQuery('#charts').click(function() {
            jQuery('.charts').toggle();

            chart.draw(ico.chartData);
        });
    }

}

/**
 * @ChartManager, this class that manage the charts that
 * describe the ic transactions.
 * @draw: the function that draw the chart
 *
 */
class ChartManeger{
    constructor(){
        this.chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };
        this.chart = null;
        jQuery("#canvas").html("");
    }

    draw(chartData){
        /**
         * @todo
         * Enhance the performance much better
         */
        console.log(chartData);
        let chartDataArray = [];
        let keys = [];
        Object.keys(chartData).map(function(key, index) {
            keys.push(key);
            chartDataArray.push(chartData[key]);
        });

        let config = {
            type: 'bar',
            data: {
                labels: keys,
                datasets: [{
                    label: jQuery('#smart-contract').val(),
                    backgroundColor: this.chartColors.red,
                    borderColor: this.chartColors.red,
                    data: chartDataArray,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Neufund ICO transactions tracker'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Daily'
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Token Numbers'
                        },
                        ticks: {
                        }
                    }]
                }
            }
        };
        let ctx = document.getElementById("canvas").getContext("2d");
        if(this.chart === null)
            this.chart = new Chart(ctx, config);
    }

}

/**
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
//    console.log(web3.eth.getBlockNumbers);

    let chart = new ChartManeger();



    console.log("Number of blocks",web3.eth.getBlockNumbers);

    // cache instance
    let cache = new CacheAdapter(ico);


    /**
     * Start fetching the transactions and store them into the cache if that written in the config.js
     * @todo
     * - Convert the tokens into the original numbers by dividing it (10**x)
     * - Make the chart more dynamic to exand the period by hours
     */
    let counter = 0;
    let items = cache.get()['data'];

    let fromBlock = 0;
    let toBlock = 999999;

    if(icoConfig.hasOwnProperty('fromBlock')){
        fromBlock = icoConfig['fromBlock'];
    }
    if(icoConfig.hasOwnProperty('toBlock')){
        toBlock = icoConfig['toBlock'];
    }

    const amount = config.skipBlocks;

    let blockIterator = (fromBlock , tblock)=>{

        ico.fetch(fromBlock , tblock, function (results , error , status , blockNumber) {
            fromBlock = blockNumber
            console.log(results , blockNumber);
            if ( error !== null || results === null){
                alert("Error: Please check ICO config", error);
                return;
            }
            // Start the spinner until the data loading will be finished
            dom.loader(true , function(){
                //turn the spinner off
                if(status !== null){
                    dom.loader(false);
                }
                // items is the transactions stored in the cache before for the current ICO

                // i is an iterator to know the number of transactions
                let i = 0;

                // if the number the transactions is one, that means he start fetching the data from the last block number that we store.
                let j = 0;
                for (j = 0 ; j < results.length ; j++){
                    let result = results[j];
                    console.log(result);
                    // get the original transaction by hash
                    web3.eth.getTransaction(result.transactionHash, (err, tx) => {
                        // check if the ICO is cachable?  see config.js
                        if (icoConfig.hasOwnProperty('enableCache') && icoConfig.enableCache)
                            cache.save(result, tx);

                        // now will push the results into items.
                        items.push(ico.toJson(result, tx));
                        result = ico.toJson(result, tx);


                        console.log(j ,results.length - 1);

                        let etherValue = web3.fromWei( result.tx.value , "ether").valueOf();
                        let sender = typeof icoConfig.args.sender !== "undefined"?result.result.args[icoConfig.args.sender]: result.tx.from;


                        const factor = icoConfig.hasOwnProperty('decimal')?10**icoConfig['decimal']:10**config['defaultDecimal'];
                        let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf()/factor;

                        if( parseInt(etherValue) === 0 && tokenNumbers !== 0){
                            etherValue = tokenNumbers/config['defaultEtherFactor'];
                        }
                        i++;

                        // append the csv variable that define at the top by its values
                        ico.appendToCSV(sender, etherValue, tokenNumbers);

                        //convert timestamp into date
                        let txDate = new Date(result.tx.timestamp*1000);


                        // get date with format d/m/y to be the uniqe key for the charts
                        let currentDate = (txDate.getDate() + '/' + (txDate.getMonth()+1) + '/' + txDate.getFullYear());
                        if (typeof ico.chartData[currentDate] === "undefined"){
                            ico.chartData[currentDate] = 0;
                        }
                        ico.chartData[currentDate] += 1;
                        dom.append(txDate , sender , etherValue , tokenNumbers);
                    });

                }
                dom.transactionsCount(j);

            });

        });
    };

    let from=fromBlock;

    fromBlock = fromBlock + 100;
    blockIterator(fromBlock , fromBlock+100);


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