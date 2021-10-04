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

        this.positions = {};

        this.tradeTemplate = {
            executionType: "TRADE",
            orderStatus: "FILLED",
            price: null,
            side: null,
            quantity: null,
            clientOrderId: "test",
            symbol: null,
        };
    }

    getTradeTemplate(obj) {
        return Object.assign(this.tradeTemplate, obj);
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

    processAndPushLine(lines, index, symbol) {
        const line = lines[index];
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
        this.onCandle(candle);

        setTimeout(() => this.fillPositionsIfAny(candle), 100);

        // testing purposes
        // if (index === 40) {
        //     return;
        // }

        setTimeout(() => {
            if (lines[index + 1]) {
                this.processAndPushLine(lines, index + 1, symbol);
            }
        }, 200);
    }

    fillPositionsIfAny(candle) {
        const position = this.positions[candle.symbol];
        let price = null;

        if (!position) {
            return;
        }

        const higherPrice =
            candle.high > candle.close ? candle.high : candle.close;
        const lowerPrice =
            candle.low < candle.close ? candle.low : candle.close;

        if (position.order.side === "BUY") {
            // take profit
            if (position.takeProfit <= higherPrice) {
                price = higherPrice;
            }

            if (position.stopLoss >= lowerPrice) {
                price = lowerPrice;
            }
        }

        if (position.order.side === "SELL") {
            if (position.takeProfit >= higherPrice) {
                price = higherPrice;
            }

            if (position.stopLoss <= lowerPrice) {
                price = lowerPrice;
            }
        }

        // if we have no price, stop
        if (!price) {
            return;
        }

        // handle take profit
        // that means when high <= takeProfit || close <= takeProfit
        // handle stopLoss
        // low >= stopLoss || close >= stopLoss

        const data = this.getTradeTemplate({
            price,
            side: position.order.side,
            quantity: position.order.quantity,
            symbol: candle.symbol,
        });

        this.onPosition(data);

        delete this.positions[candle.symbol];
    }

    _run() {
        const symbol = Object.keys(this.coins)[0];

        try {
            // open file
            const file = fs.readFileSync(
                __dirname + "/../../paper-test.csv",
                "utf-8"
            );

            // read data from it
            this.processAndPushLine(file.split(/\r?\n/), 0, symbol);
        } catch (e) {
            console.log("error", e);
        }
    }

    _timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    getCurrentPrice(coin, isShort = false) {
        const price = parseFloat(
            this.candleData[this.candleData.length - 1].close
        );

        return price + parseFloat(isShort ? -0.01 : 0.01);
    }

    getExchangeInfo(coin, item) {
        return 2;
    }

    async openLong(symbol, amount) {
        const price = this.getCurrentPrice(symbol, false);
        const quantity = (amount / this.getCurrentPrice(symbol, false)).toFixed(
            this.getExchangeInfo(symbol, "stepSize")
        );

        console.log("opening long");
        console.log("current price is", price);

        const data = this.getTradeTemplate({
            price,
            side: "BUY",
            quantity,
            symbol,
        });

        this.positions[symbol] = {
            order: {
                price: data.price,
                side: data.side,
                quantity: data.quantity,
            },
        };

        this.onPosition(data);
    }

    async openShort(symbol, amount) {
        console.log("opening short");
        const price = this.getCurrentPrice(symbol);
        const quantity = (amount / this.getCurrentPrice(symbol)).toFixed(
            this.getExchangeInfo(symbol, "stepSize")
        );
        console.log("current price is", price);

        const data = {
            price: this.getCurrentPrice(symbol, false),
            side: "SELL",
            quantity,
            symbol,
        };

        this.positions[symbol] = {
            order: {
                price: data.price,
                side: data.side,
                quantity: data.quantity,
            },
        };

        this.onPosition(data);
    }

    addStopLoss(symbol, price) {
        console.log("added stop loss", price);

        this.positions[symbol]["stopLoss"] = price;
    }

    addTakeProfit(symbol, price) {
        console.log("added take profit", price);

        this.positions[symbol]["takeProfit"] = price;
    }
}

module.exports = Paper;
