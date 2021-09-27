const _ = require("lodash");

class CandleDataHelper {
    constructor(candleData) {
        this.candleData = candleData.hasOwnProperty("length")
            ? candleData
            : Object.values(candleData);
    }

    getData() {
        return this.candleData;
    }

    mapIntoField(field, length = null) {
        if (!length) {
            length = this.candleData.length;
        }

        return _.takeRight(
            this.candleData.map((item) => parseFloat(item[field])),
            length
        );
    }

    getCandle(index = null) {
        if (index < 0) {
            index = this.candleData.length + index;
        }

        return this.candleData[index];
    }

    getCurrentPrice() {
        return this.candleData[this.candleData.length - 1]["close"];
    }
}

module.exports = CandleDataHelper;
