const LastPosition = require("./../Support/Strategies/LastPosition");
const StrategyConfig = require("../Support/Strategies/StrategyConfig");
const CandleDataHelper = require("../Support/Strategies/CandleDataHelper");
const hash = require("object-hash");

class AbstractStrategy {
    constructor(overwriteConfig = {}) {
        this.BUY = 1;
        this.SELL = -1;

        this.config = new StrategyConfig(this.constructor.name);

        if (overwriteConfig) {
            this.config.mergeConfig(overwriteConfig);
        }

        this.fullConfigName = hash(
            Object.assign({}, { name: this.constructor.name }, overwriteConfig)
        );

        this.lastPosition = new LastPosition(this.fullConfigName);
    }

    getFullConfigName() {
        return this.fullConfigName;
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

    getTakeProfitPrice() {
        const takeProfit = this.getConfig("takeProfit");
        const currentPrice = parseFloat(this.getCurrentPrice());
        const lastPositionPrice = parseFloat(this.getLastPosition("price"));

        if (!takeProfit) {
            return 0;
        }

        const profitAmount = parseFloat(lastPositionPrice * takeProfit);

        return (
            parseFloat(lastPositionPrice) + this.getNextSide() * profitAmount
        );
    }

    getStopLossPrice() {
        const stopLoss = this.getConfig("stopLoss");
        const currentPrice = parseFloat(this.getCurrentPrice());
        const lastPositionPrice = parseFloat(this.getLastPosition("price"));

        if (!stopLoss) {
            return 0;
        }

        const stopLossAmount = parseFloat(lastPositionPrice * stopLoss);

        return (
            parseFloat(lastPositionPrice) - this.getNextSide() * stopLossAmount
        );
    }

    profitTrigger() {
        const currentPrice = this.getCurrentPrice();
        const profitPrice = this.getTakeProfitPrice();

        if (profitPrice === 0) {
            return false;
        }

        let response =
            this.getNextSide() === this.SELL
                ? currentPrice <= profitPrice
                : currentPrice >= profitPrice;

        return response;
    }

    stopLossTrigger() {
        const currentPrice = this.getCurrentPrice();
        const stopLossPrice = this.getStopLossPrice();

        if (stopLossPrice === 0) {
            return false;
        }

        let response = this.isCurrentSide("SELL")
            ? currentPrice >= stopLossPrice
            : currentPrice <= stopLossPrice;

        return response;
    }

    setLastPosition(position, type = null, isFinal = false) {
        let toMerge = { isFinal };

        if (type) toMerge.type = type;

        this.getLastPosition().setLastPosition(
            Object.assign({}, position, toMerge)
        );
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
