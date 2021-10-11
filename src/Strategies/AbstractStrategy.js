const LastPosition = require("./../Support/Strategies/LastPosition");
const StrategyConfig = require("./../Support/Strategies/StrategyConfig");
const CandleDataHelper = require("./../Support/Strategies/CandleDataHelper");

class AbstractStrategy {
    constructor(overwriteConfig = {}) {
        this.BUY = 1;
        this.SELL = -1;

        this.config = new StrategyConfig(this.constructor.name);

        if (overwriteConfig) {
            this.config.mergeConfig(overwriteConfig);
        }

        this.lastPosition = new LastPosition(this.constructor.name);
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

    getCurrentPrice() {
        return this.candleDataHelper.getCurrentPrice();
    }

    getAmount() {
        return parseFloat(
            this.getConfig("amount") * this.getConfig("leverage")
        );
    }

    getTakeProfitPrice(price, side = 1) {
        const takeProfit = this.getConfig("takeProfit");

        if (!takeProfit) {
            return 0;
        }

        return side === 1 ? price * takeProfit : price / takeProfit;

        // const profitAmount = parseFloat(price * takeProfit);
        //
        // return price + (profitAmount * side < 0 ? -1 : 1);
    }

    getStopLossPrice(price, side = 1) {
        const stopLoss = this.getConfig("stopLoss");

        if (!stopLoss) {
            return 0;
        }

        return side === 1 ? price * stopLoss : price / stopLoss;

        // const profitAmount = parseFloat(price * stopLoss);
        //
        // return price + (profitAmount * side < 0 ? -1 : 1);
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

    logTransaction(data) {
        this.lastPosition.write(data);
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
