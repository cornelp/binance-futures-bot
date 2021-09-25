const Logger = require("./../Logic/Logger");

class AbstractStrategy {
    constructor() {
        this.currentCoin = undefined;

        this.logger = new Logger(this.constructor.name);
    }

    setConfiguration(config) {
        if (!this.config) {
            this.loadConfiguration();
        }

        this.config = Object.assign({}, this.config, config);
        this.determineCoins();
    }

    getCoins() {
        return this.coins;
    }

    getCoin() {
        return this.coins[this.currentCoin];
    }

    getConfig(key) {
        return this.config[key];
    }

    determineCoins() {
        const symbol = this.getConfig("symbol");

        this.coins = symbol.split(",");
    }

    loadConfiguration() {
        const configName = this.constructor.name
            .match(/[A-Z][a-z]+/g)
            .map((item) => item.toLowerCase())
            .join("-");

        this.config = Object.assign(
            {},
            require("./../../config/default"),
            require("./../../config/" + configName)
        );

        this.determineCoins();
    }

    getCurrentCoin() {
        return this.coins[this.currentCoin];
    }

    selectNextCoin(index = null) {
        if (this.isInPosition()) {
            this.currentCoin = parseInt(this.logger.get('symbolIndex'));

            return;
        }

        this.currentCoin =
            index === null
                ? typeof this.currentCoin === "undefined" ||
                  this.currentCoin >= this.coins.length - 1
                    ? 0
                    : this.currentCoin + 1
                : index;
    }

    isCoinLast() {
        return parseInt(this.currentCoin) >= this.coins.length - 1;
    }

    getInfo() {
        if (!this.config) {
            this.loadConfiguration();
        }

        this.selectNextCoin();

        return {
            symbol: this.coins[this.currentCoin],
            interval: this.getConfig("interval"),
            limit:
                this.candleData &&
                this.candleData[this.currentCoin] &&
                this.candleData[this.currentCoin].length
                    ? this.getConfig("renewCandleCount")
                    : this.getConfig("candleCount"),
        };
    }

    setCandleData(index, data) {
        const candleData = this.candleData[this.currentCoin];

        index = index < 0 ? candleData.length + index : index;
        
        this.candleData[this.currentCoin][index] = data;
    }

    setCurrentCandleData(data) {
        if (!this.candleData) {
            this.candleData = {};
            this.candleData[this.currentCoin] = [];
        }

        const lastTimestamp = parseInt(data[data.length - 1]["closeTime"]);

        // check if timestamp has changed
        if (!this.isCandleTimestampChanged(lastTimestamp)) {
            this.setCandleData(-1, data[data.length - 1]);
        } else {
            if (
                this.candleData[this.currentCoin] &&
                this.candleData[this.currentCoin].length
            ) {
                // if the timestamp changed
                // that means we need to overwrite the previous one
                // there's a big chance that the previous one wasn't complete, therefore the prices changed
                this.setCandleData(-2, data[data.length - 2]);

                // remove first element
                this.candleData[this.currentCoin].shift();

                // inject the last
                this.candleData[this.currentCoin].push(data[data.length - 1]);
            } else {
                // set data
                this.candleData[this.currentCoin] = data;
            }
        }

        console.log(`Current price is ${this.getCurrentPrice()}`);

        // return true;
        this.run();
    }

    isCandleTimestampChanged(lastTimestamp) {
        const timestamp = this.getCandleData(-1, "closeTime");

        return !timestamp || lastTimestamp > timestamp;
    }

    getCurrentCandleData(field = null) {
        const data = this.candleData ? this.candleData[this.currentCoin] : [];

        if (!field) return data;

        return data.map((item) => parseFloat(item[field]));
    }

    getCandleData(index, prop = null, defaultValue = 0) {
        const candles = this.getCurrentCandleData();

        if (!candles || !candles.length) {
            return null;
        }

        const candle = candles[index < 0 ? candles.length + index : index];

        if (!prop) {
            return candle;
        }

        return candle[prop];
    }

    isInPosition() {
        return this.logger.isInPosition();
    }

    getCurrentPrice() {
        return this.getCandleData(-1, "close");
    }

    profitTrigger() {
        const takeProfit = this.getConfig("takeProfit");
        const currentPrice = parseFloat(this.getCurrentPrice());

        // if we don't have a takeProfit value
        // we never stop (actually we will when the reverse signal is present)
        if (!takeProfit) {
            return false;
        }

        const profitAmount = parseFloat(this.logger.get("price") * takeProfit);
        const profitPrice =
            parseFloat(this.logger.get("price")) +
            this.logger.getCurrentSide() * profitAmount;

        let response =
            this.logger.getCurrentSide() === this.logger.SELL
                ? currentPrice <= profitPrice
                : currentPrice >= profitPrice;

        this.logger.write(`We will TP at ${profitPrice}`, "info");

        this.logger.write(
            `${
                response ? "Sounds OK to close position" : "Nothing to do"
            }, current price ${currentPrice}`,
            "POSITION"
        );

        return response;
    }

    getCurrentSide() {
        return this.logger.getCurrentSide();
    }

    stopLossTrigger() {
        const stopLoss = this.getConfig("stopLoss");
        const currentPrice = parseFloat(this.getCurrentPrice());

        if (!stopLoss) {
            return false;
        }

        const stopLossAmount = parseFloat(this.logger.get("price") * stopLoss);
        const stopLossPrice =
            parseFloat(this.logger.get("price")) -
            this.getCurrentSide() * stopLossAmount;

        let response =
            this.getCurrentSide() === this.logger.SELL
                ? currentPrice >= stopLossPrice
                : currentPrice <= stopLossPrice;

        this.logger.write(`We will SL at ${stopLossPrice}`, "info");

        this.logger.write(
            `${
                response ? "Sounds OK to close position" : "Nothing to do"
            }, current price ${currentPrice}`,
            "POSITION"
        );

        return response;
    }

    addedLongPosition(quantity, orderId = null) {
        this.logger.setLastPosition({
            type: 1,
            symbolIndex: this.currentCoin,
            price: this.getCurrentPrice(),
            symbol: this.getCurrentCoin(),
            quantity,
            orderId: orderId || "test",
            isFinal: false,
        });
    }

    addedShortPosition(quantity, orderId = null) {
        this.logger.setLastPosition({
            type: -1,
            symbolIndex: this.currentCoin,
            price: this.getCurrentPrice(),
            symbol: this.getCurrentCoin(),
            quantity,
            orderId: orderId || "test",
            isFinal: false,
        });
    }

    getLastOrderId() {
        return this.logger.get("orderId");
    }

    getLastAmount() {
        return this.logger.get("amount");
    }

    getLeverage() {
        return this.logger.get("leverage") || 1;
    }

    getMarginType() {
        return this.logger.get("marginType");
    }

    saveClosedPosition() {
        this.logger.setLastPosition({
            isFinal: true,
            price: this.getCurrentPrice(),
        });
    }

    canClosePosition() {
        return this.isProfitOrStopLoss();
    }

    getQuantity(info) {
        if (this.logger.isCurrentSide("SELL") && this.logger.isInPosition()) {
            return this.logger.get("quantity");
        }

        // if we want to buy,
        // get the (amount / current price).toFixed(this.getTickSize())
        const quantity = (
            this.getConfig("amount") / this.getCurrentPrice()
        ).toFixed(info.stepSize);

        if (quantity < info.minQty) {
            return 0;
        }

        return quantity;
    }

    isProfitOrStopLoss() {
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
