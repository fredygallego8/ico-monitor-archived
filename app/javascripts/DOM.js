import Chart from 'chart.js';
import jQuery from 'jquery';

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
        if(this.chart !== null)
            this.chart.destroy();
        this.chart = new Chart(ctx, config);

    }

}



/**
 * This class to handle any thing retalted the DOM.
 * @Dom
 * @append : tot add the transactions on the table
 * @transactionsCount: change the transactions count
 * @loader: toggle the spin that comes before loading any data.
 */
class Dom{
    constructor(){
//        console.log("Dom start" , providers);
        this.chart = new ChartManeger();
    }

    append(...data){
        if(jQuery("#data .body").length > 100)
            jQuery('#data .body').html("");

        let transaction =`<ul> ${data.map((result)=>`<li>${result}</li>`)}</ul>`;

        jQuery('#data .body').prepend(transaction);
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
            jQuery('.charts').toggle();

            chart.draw(ico.chartData);
            jQuery("#loader").hide();

        });
    }

}

export default Dom;
