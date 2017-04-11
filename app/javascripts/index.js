import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import { default as config } from './config.js'
import jQuery from 'jquery'
import Chart from 'chart.js'
import ICO from './ICO.js';
import CacheAdapter from './CacheAdapter.js';

let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(`http://${config.host}:${config.port}`))
const providers = config.icos;


/**
 * This class to handle any thing retalted the DOM.
 * @append : tot add the transactions on the table
 * @transactionsCount: change the transactions count
 * @loader: toggle the spin that comes before loading any data.
 */
class Dom{
    constructor(){
        console.log("Dom start" , providers)
        this.chart = new ChartManeger();
    }

    append(...data){
        let transaction =
            `<tr>
    ${data.map((result)=> `
        <td>${result}</td>
    `)}
    </tr>`;
        jQuery('#data tbody').append(transaction);
    };

    transactionsCount(number){
        jQuery('#transaction_number').html(number);
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
            chart.draw(ico.chartData)
        });
    }

}

/**
 * Chart Manager, this class that manage the charts that
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
    }

    draw(chartData){
        console.log(chartData);
        let chartDataArray = [];
        let keys = [];
        Object.keys(chartData).map(function(key, index) {
            keys.push(key);
            chartDataArray.push(chartData[key]);
        });

        let config = {
            type: 'line',
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
        new Chart(ctx, config);
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

    console.log("Number of blocks",ico.getBlockNumbers());

    // cache instance
    let cache = new CacheAdapter(ico);


    /**
     * Start fetching the transactions and store them into the cache if that written in the config.js
     * @todo
     * - Convert the tokens into the original numbers by dividing it (10**x)
     * - Make the chart more dynamic to exand the period by hours
     */
    ico.fetch(function (results , error) {
        if ( error !== null){
            alert(error);
            return;
        }
        console.log(results);

        // Start the spinner until the data loading will be finished
        dom.loader(true , function(){

            // items is the transactions stored in the cache before for the current ICO
            let items = cache.get()['data'];

            // i is an iterator to know the number of transactions
            let i = 0;

            // if the number the transactions is one, that means he start fetching the data from the last block number that we store.
            if(results.length > 1 )
                results.map((result )=> {

                    // get the original transaction by hash
                    let tx = web3.eth.getTransaction(result.transactionHash);

                    // check if the ICO is cachable?  see config.js
                    if (icoConfig.hasOwnProperty('enableCache') && icoConfig.enableCache)
                        cache.save(result, tx);

                    // now will push the results into items.
                    items.push(ico.toJson(result, tx))
                });


            // iterate ove the items to manipulate them by DOM class
            for(let j = 0 ; j < items.length ; j++){
                let result = items[i];

                // change the current value into ether by web3.fromWei
                let etherValue = web3.fromWei( result.tx.value , "ether").valueOf();
                let sender = typeof icoConfig.args.sender !== "undefined"?result.result.args[icoConfig.args.sender]: result.tx.from;


                let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf();
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
                console.log(sender);
                dom.append(txDate , sender , etherValue , tokenNumbers);

                dom.transactionsCount(i);

                //turn the spinner off
                dom.loader(false);

            }
        });


    });

    dom.csvButtonOnClick(ico);
    dom.chartButtonOnClick(ico);
};


window.addEventListener('load',  ()=> {

    Object.keys(providers).forEach((address, index) => {
        jQuery('#smart-contract').append(`<option value="${address}"> ${address.toString().toUpperCase()} </option>`)
    });
    jQuery('#smart-contract').change((e)=> {
        init( e.target.value);
    })

});