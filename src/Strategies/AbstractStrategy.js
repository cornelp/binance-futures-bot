const LastPosition = require("./../Support/Strategies/LastPosition");
const StrategyConfig = require("../Support/Strategies/StrategyConfig");
const CandleDataHelper = require("../Support/Strategies/CandleDataHelper");

class AbstractStrategy {
    constructor(config = {}) {
        this.BUY = 1;
        this.SELL = -1;

        this.lastPosition = new LastPosition(this.constructor.name);
        this.config = new StrategyConfig(this.constructor.name);

        if (config) {
            this.config.mergeConfig(config);
        }
    }

    bootstrap(candleData) {
        this.candleDataHelper = new CandleDataHelper(candleData);

        this.run();
    }

    getCandleData() {
        return this.candleDataHelper;
    }

    getConfig(index = null) {
        return this.config.get(index);
    }

    getIntervalForCoin(coin) {
        if (!this.coins) {
            this.getCoins();
        }

        if (!this.intervals) {
            this.intervals = this.config
                .get("interval")
                .split(",")
                .filter((item) => item);
        }

        // get index for coin
        let index = this.coins.findIndex((c) => c === coin);

        if (!index) index = 0;

        return this.intervals[index] || this.intervals[0];
    }

    getCoins() {
        if (!this.coins) {
            this.coins = this.config
                .get("symbol")
                .split(",")
                .filter((item) => item);
        }

        return this.coins;
    }

    getLastPosition(name = null) {
        if (!name) {
            return this.lastPosition;
        }

        return this.lastPosition.get(name);
    }

    // gets the current side
    // takes into consideration isFinal
    // - should be used for opening a new order
    getNextSide() {
        let type = this.getLastPosition("type");
        const isFinal = this.getLastPosition("isFinal");

        if (isFinal) return type * -1;

        if (!type) return this.BUY;

        return type;
    }

    // checks if the current side is of type
    // does not check isFinal
    // - should be used for closing a position
    isCurrentSide(type = "BUY") {
        let configType = this.getLastPosition("type");

        if (configType === undefined) {
            configType = this.BUY;
        }

        return configType === this[type.toUpperCase()];
    }

    isCoinInPosition(coin) {
        const symbol = this.getLastPosition("symbol");

        return symbol === coin;
    }

    isInPosition(coin) {
        const isFinal = this.getLastPosition("isFinal");

        if (isFinal === undefined) {
            return false;
        }

        return !isFinal;
    }

    getCurrentPrice() {
        return this.candleDataHelper.getCurrentPrice();
    }

    getQuantity(price, stepSize) {
        if (
            this.getConfig().hasOwnProperty("isFinal") &&
            !this.getConfig("isFinal")
        ) {
            return this.getLastPosition("quantity");
        }

        return (this.getConfig("amount") / this.getCurrentPrice()).toFixed(
            stepSize
        );
    }

    profitTrigger() {
        const takeProfit = this.getConfig("takeProfit");
        const currentPrice = parseFloat(this.getCurrentPrice());
        const lastPositionPrice = parseFloat(this.getLastPosition("price"));

        if (!takeProfit) {
            return false;
        }

        const profitAmount = parseFloat(lastPositionPrice * takeProfit);
        const profitPrice =
            parseFloat(lastPositionPrice) + this.getNextSide() * profitAmount;

        let response =
            this.getNextSide() === this.SELL
                ? currentPrice <= profitPrice
                : currentPrice >= profitPrice;

        return response;
    }

    stopLossTrigger() {
        const stopLoss = this.getConfig("stopLoss");
        const currentPrice = parseFloat(this.getCurrentPrice());
        const lastPositionPrice = parseFloat(this.getLastPosition("price"));

        if (!stopLoss) {
            return false;
        }

        const stopLossAmount = parseFloat(lastPositionPrice * stopLoss);
        const stopLossPrice =
            parseFloat(lastPositionPrice) - this.getNextSide() * stopLossAmount;

        let response = this.isCurrentSide("SELL")
            ? currentPrice >= stopLossPrice
            : currentPrice <= stopLossPrice;
    }

    setLastPosition(coin, quantity, isFinal = false) {
        this.getLastPosition().setLastPosition({
            type: isFinal ? this.getLastPosition("type") : this.getNextSide(),
            symbol: coin,
            quantity,
            price: this.getCurrentPrice(),
            isFinal,
        });
    }

    canClosePosition() {
        console.log("This needs to be overwritten");
    }

    isSignalShort() {
        console.log("This needs to be overwritten");
    }

    isSignalLong() {
        console.log("This needs to be overwritten");
    }

    run() {
        console.log("This needs to be overwritten");
    }
}

module.exports = AbstractStrategy;
