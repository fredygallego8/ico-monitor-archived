/**
 * CacheAdapter
 *  We use this class to store the data.
 *  @todo
 *  Store the huge ICO in different storage.
 */
class CacheAdapter {
    constructor(ico){
        this.ico = ico;
    }
    save(...record){
        const key = this.ico.name;
        const icoData = this.get();
        console.log(icoData);
        icoData.data.push(this.ico.toJson(record[0] , record[1])); // save result , transaction
        icoData.lastBlockNumber = record[1].blockNumber;

        localStorage.setItem(key , JSON.stringify(icoData) );
    }
    get(){
        let data = JSON.parse( localStorage.getItem(this.ico.name) );

        if (data === null || !data.hasOwnProperty('lastBlockNumber')){ //ICO not saved before.
            data = {};
            data.lastBlockNumber = 0;
            data.data = [];
        }
        return data;
    }
}

export default CacheAdapter;
