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


    randomScalingFactor() {
        return (Math.random() > 0.5 ? 1.0 : -1.0) * Math.round(Math.random() * 100);
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

function init(ICONAME){
    /* Implementation */
    let icoConfig = providers[ICONAME];
    let dom = new Dom();

    let ico = new ICO(web3,icoConfig['address'] , ICONAME, icoConfig['abi']);

    console.log("Number of blocks",ico.getBlockNumbers());

    let cache = new CacheAdapter(ico);

    ico.fetch(function (results , error) {
        if ( error !== null){
            alert(error);
            return;
        }
        console.log(results);

        dom.loader(true , function(){

            let items = cache.get()['data'];

            let i = 0;
            if(results.length > 1 )
                results.map((result )=> {

                    let tx = web3.eth.getTransaction(result.transactionHash);
                    if (icoConfig.hasOwnProperty('enableCache') && icoConfig.enableCache)
                        cache.save(result, tx);

                    items.push(ico.toJson(result, tx))
                });

            for(let j = 0 ; j < items.length ; j++){
                let result = items[i];
                let etherValue = web3.fromWei( result.tx.value , "ether").valueOf();
                let sender = typeof icoConfig.args.sender !== "undefined"?result.result.args[icoConfig.args.sender]: result.tx.from;
                let tokenNumbers = result.result.args[icoConfig.args.tokens].valueOf();
                i++;
                ico.appendToCSV(sender, etherValue, tokenNumbers);

                let txDate = new Date(result.tx.timestamp*1000);

                let currentDate = (txDate.getDate() + '/' + (txDate.getMonth()+1) + '/' + txDate.getFullYear());
                if (typeof ico.chartData[currentDate] === "undefined"){
                    ico.chartData[currentDate] = 0;
                }
                ico.chartData[currentDate] += 1;
                console.log(sender);
                dom.append(txDate , sender , etherValue , tokenNumbers);

                dom.transactionsCount(i);
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