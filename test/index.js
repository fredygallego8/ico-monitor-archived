/**
 * Created by mostafa on 4/10/17.
 */
//
// it("should pass if the minter is address", function() {
//     // Get a reference to the deployed MetaCoin contract, as a JS object.
//     return Coin.deployed().then(function (instance) {
//         instance.getMinter.call().then(function(result){
//             console.log("Minter 1 is ",result)
//             assert.isString( result , "This is not string")
//         });
//     })
// });


import ICO from '../app/javascripts/ICO';
import CacheAdapter from '../app/javascripts/CacheAdapter';
import { default as config } from '../app/javascripts/config.js'
import {default as Web3} from 'web3';

let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(`http://${config.host}:${config.port}`))
const providers = config.icos;
let assert = require('assert');
const ICONAME = 'MelonPort';
let icoConfig = providers[ICONAME];
let ico = new ICO(web3,icoConfig['address'] , ICONAME, icoConfig['abi']);

describe('ICO', function() {

    it('should return transactions for the ICO that existing on the config.js', function(done) {
        // simulate async expecation
            // complete the async expectation
        ico.fetch(function (results , error) {
            if(error){
                assert.ok(false);
            }
            done();
        });

    });

    it('should return number of blocks', function() {
        assert.equal(3187613, ico.getBlockNumbers());
    });

});

describe('CacheAdapter', function () {
    let cache = new CacheAdapter(ico);
    it('should save the results into localStorage',function (done) {
        const result = {
            args : {},
            address:'123123',
            transactionHash:'123123'
        };
        const tx = {
            from:'123',
            gas:3332,
            blockNumber:32323,
            to:'ffff',
            value:'sdfadf',
            timestamp:123123213
        };
        try{
            cache.save(result, tx);
            done()
        }catch(Error){
            assert.ok(false);
        }
    });

    it('should return the results of the ICO data',function () {
        cache.get() !== null?assert.ok(true):assert.ok(false);
    })
});