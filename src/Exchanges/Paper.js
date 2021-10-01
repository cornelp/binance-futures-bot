const AbstractExchange = require("./AbstractExchange");
const fs = require("fs");
const _ = require("lodash");

class Paper {
    constructor(apiKey, apiSecret) {
        // super();
        this.coins = {};
        this.candleData = [];

        this.interval = null;
        this.candleCount = null;
        this.onCandle = null;
        this.onPosition = null;
    }

    setOnPosition(callback) {
        this.onPosition = callback;
    }

    setOnCandle(callback) {
        this.onCandle = callback;

        this._run();
    }

    hasCandleDataFor(symbol) {
        return this.candleData.length >= this.candleCount;
    }

    async coinHasOrder(symbol) {
        return false;
    }

    async coinHasPosition(symbol) {
        return false;
    }

    summary(coins, interval, candleCount) {
        this.interval = interval;
        this.candleCount = candleCount;

        this.coins = coins.reduce((acc, coin) => {
            acc[coin] = [];
            return acc;
        }, {});
    }

    getCandleDataFor(coin) {
        return _.takeRight(this.candleData, this.candleCount);
    }

    subscribeToPosition(callback) {
        this.setOnPosition(callback);
    }

    _run() {
        const symbol = Object.keys(this.coins)[0];

        try {
            // open file
            const file = fs.readFileSync(
                __dirname + "/../../paper.csv",
                "utf-8"
            );

            // read data from it
            const lines = file.split(/\r?\n/);

            lines.forEach((line) => {
                const values = line.split(",");

                if (!values.length) {
                    return;
                }

                const candle = {
                    time: values[0],
                    open: values[1],
                    close: values[2],
                    low: values[3],
                    high: values[4],
                    symbol,
                };

                this.candleData.push(candle);
            }, this);

            this.candleData.forEach((candle) => {
                setTimeout(() => this.onCandle(candle), 500);
            });
        } catch (e) {
            console.log("error", e);
        }
    }

    _timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    getCurrentPrice(coin, isShort = false) {
        const price = this.candleData[this.candleData.length - 1].close;

        return price * (isShort ? 1 / 0.01 : 1.01);
    }

    getExchangeInfo(coin, item) {
        return 0.2;
    }

    async openLong(symbol, amount) {
        const quantity = (amount / this.getCurrentPrice(symbol, false)).toFixed(
            this.getExchangeInfo(symbol, "stepSize")
        );

        const data = {
            executionType: "TRADE",
            orderStatus: "FILLED",
            price: this.getCurrentPrice(symbol),
            side: "BUY",
            quantity,
            clientOrderId: "test",
            symbol,
        };

        this.onPosition(data);
    }

    async openShort(symbol, amount) {
        const quantity = (amount / this.getCurrentPrice(symbol, false)).toFixed(
            this.getExchangeInfo(symbol, "stepSize")
        );

        const data = {
            executionType: "TRADE",
            orderStatus: "FILLED",
            price: this.getCurrentPrice(symbol, false),
            side: "BUY",
            quantity,
            clientOrderId: "test",
            symbol,
        };

        this.onPosition(data);
    }
}

module.exports = Paper;
