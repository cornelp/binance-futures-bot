const BinanceClient = require("binance-api-node").default;
const AbstractExchange = require("./AbstractExchange");
const _ = require("lodash");

class Binance extends AbstractExchange {
    constructor(apiKey, apiSecret) {
        super();

        this.client = new BinanceClient({ apiKey, apiSecret });

        this.exchangeInfo = {};
        this.candleData = {};
        this.onCandle = null;

        this.interval = null;
        this.candleCount = null;

        this.currentPrice = {};
    }

    async coinHasOrder(symbol) {
        const info = await this.client.openOrders({ symbol });

        return !!info.length;
    }

    async coinHasPosition(symbol) {
        let position = await this.client.futuresPositionRisk({ symbol });

        if (!position.length) {
            return false;
        }

        position = position[0];

        return parseFloat(position.positionAmt) !== 0;
    }

    async getOpenedOrders(symbol) {
        const orders = await this.client.futuresOpenOrders({
            symbol,
            useServerTime: true,
        });

        return orders;
    }

    cancelOrder(symbol, orderId) {
        this.client.futuresCancelOrder({
            symbol,
            orderId,
            useServerTime: true,
        });
    }

    async _fetchExchangeInfo(coins) {
        const exchangeInfo = await this.client.futuresExchangeInfo();

        if (!exchangeInfo.symbols) {
            return;
        }

        this.exchangeInfo.symbols = exchangeInfo.symbols
            .filter((item) => coins.indexOf(item.symbol) > -1)
            .reduce((acc, item) => {
                const stepSize = Math.max(
                    item.filters[1].stepSize.toString().indexOf("1") - 1,
                    0
                );
                const tickSize = Math.max(
                    item.filters[0].tickSize.toString().indexOf("1") - 1,
                    0
                );

                //  for current price
                this.currentPrice[item.symbol] = null;

                acc[item.symbol] = {
                    minQty: item.filters[1].minQty,
                    stepSize,
                    tickSize,
                };

                return acc;
            }, {});

        if (!exchangeInfo.rateLimits) {
            return;
        }

        // save also limits
        this.exchangeInfo.rateLimits = exchangeInfo.rateLimits;
    }

    summary(coins, interval, candleCount) {
        this.interval = interval;
        this.candleCount = candleCount;

        this._fetchExchangeInfo(coins);
        this._subscribe(coins, interval);
    }

    setManualCurrentPrice(coin, price) {
        this.currentPrice[coin] = parseFloat(price);
    }

    _subscribe(coins, interval, candleCount = 200) {
        coins.forEach(async (coin) => {
            this.candleData[coin] = [];

            if (candleCount <= 2) {
                return;
            }

            // fetch warmup candles
            this.candleData[coin] = await this.client.futuresCandles({
                symbol: coin,
                interval,
                limit: candleCount - 1,
            });
        }, this);

        this.client.ws.futuresCandles(coins, interval, (candle) => {
            const candleData = this.candleData[candle.symbol];

            this.currentPrice[candle.symbol] = parseFloat(candle.close);

            if (candle.isFinal) {
                // remove first element if there are too many elements
                if (candleData.length >= candleCount) {
                    candleData.shift();
                }

                // push final element
                this.candleData[candle.symbol].push(candle);

                // let callback know
                if (this.onCandle) {
                    this.onCandle(candle);
                }
            }
        });
    }

    hasCandleDataFor(coin) {
        return this.candleData[coin].length >= this.candleCount;
    }

    getCandleDataFor(coin) {
        return _.takeRight(this.candleData[coin], this.candleCount);
    }

    setOnCandle(callback) {
        this.onCandle = callback;
    }

    subscribeToPosition(callback) {
        this.client.ws.futuresUser((evt) => {
            if (evt.executionType === "TRADE" && evt.orderStatus === "FILLED") {
                return callback(evt);
            }
        });
    }

    getExchangeInfo(coin, item) {
        return this.exchangeInfo.symbols[coin][item];
    }

    getCurrentPrice(coin, multiplier = true) {
        console.log("current price is now", this.currentPrice[coin]);
        let price = this.currentPrice[coin] + (!multiplier ? -0.02 : 0.02);

        return this.formatPrice(coin, price);
    }

    formatPrice(coin, price) {
        const tick = this.getExchangeInfo(coin, "tickSize");
        const pow = Math.pow(10, tick || 1);

        return Math.floor(price * pow) / pow;
    }

    async openLong(coin, amount) {
        const quantity = (amount / this.getCurrentPrice(coin)).toFixed(
            this.getExchangeInfo(coin, "stepSize")
        );

        const data = {
            symbol: coin,
            side: "BUY",
            type: "LIMIT",
            quantity,
            price: this.getCurrentPrice(coin, true),
            timeInForce: "GTC",
            useServerTime: true,
        };
        console.log(data);

        await this.client.futuresOrder(data);

        return data;
    }

    async openShort(coin, amount) {
        // first calculate quantity
        const quantity = (amount / this.getCurrentPrice(coin, false)).toFixed(
            this.getExchangeInfo(coin, "stepSize")
        );

        const data = {
            symbol: coin,
            side: "SELL",
            type: "LIMIT",
            price: this.getCurrentPrice(coin, false),
            quantity,
            timeInForce: "GTC",
            useServerTime: true,
        };
        console.log(data);

        await this.client.futuresOrder(data);

        return data;
    }

    async addStopLoss(coin, stopLossPrice, evt) {
        const price = this.formatPrice(coin, stopLossPrice);

        const data = {
            symbol: coin,
            side: evt.side === "BUY" ? "SELL" : "BUY",
            positionSide: "BOTH",
            type: "STOP",
            quantity: evt.quantity,
            stopPrice: price,
            price,
            timeInForce: "GTC",
            useServerTime: true,
        };
        console.log(data);

        const order = await this.client.futuresOrder(data);

        return order;
    }

    async addTakeProfit(coin, takeProfitPrice, evt) {
        const price = this.formatPrice(coin, takeProfitPrice);

        const data = {
            symbol: coin,
            side: evt.side === "BUY" ? "SELL" : "BUY",
            positionSide: "BOTH",
            type: "TAKE_PROFIT",
            quantity: evt.quantity,
            stopPrice: price,
            price,
            timeInForce: "GTC",
            useServerTime: true,
        };
        console.log(data);

        const order = await this.client.futuresOrder(data);

        return order;
    }
}

module.exports = Binance;
