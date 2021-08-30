class AbstractStrategy {
    constructor(client, lastPosition, logger) {
        this.loadConfiguration();
        this.previousPrices = [];

        this.setIsBusy(true);

        this.client = client;
        this.lastPosition = lastPosition;
        this.logger = logger;
    }

    setIsBusy(status = true) {
        console.log("setting busy status to " + status);
        this.isBusy = status;
    }

    setCurrentPrice(currentPrice) {
        // if it's not the first value,
        // just add it to previous prices
        if (this.currentPrice) {
            this.addToPreviousPrices(this.currentPrice);
        }

        this.currentPrice = currentPrice;

        // console.log("current price is " + this.currentPrice);
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
    }

    getCurrentPrice() {
        return this.currentPrice;
    }

    setPreviousPrices(previousPrices) {
        this.previousPrices = previousPrices;
    }

    addToPreviousPrices(currentPrice) {
        if (this.previousPrices.length >= this.config.previousPricesNo) {
            // remove first element
            this.previousPrices.shift();
        }

        this.previousPrices.push(currentPrice);
    }

    getConfig(key) {
        return this.config[key];
    }

    getLastTimestampFrom(data) {
        // get keys (timestamps)
        // take last timestamp from array
        return parseInt(Object.keys(data).pop());
    }

    setCandleData(data, callback = null) {
        const lastTimestamp = this.getLastTimestampFrom(data);

        // getting current price from last candle
        // this.setCurrentPrice(data[lastTimestamp].close);

        // check if timestamp has changed
        if (!this.isCandleTimestampChanged(lastTimestamp)) {
            return false;
        }

        this.candleData = data;
        this.lastTimestamp = lastTimestamp;

        if (callback) {
            callback();
        }
    }

    isCandleTimestampChanged(lastTimestamp) {
        if (!this.lastTimestamp) {
            return true;
        }

        return this.lastTimestamp < lastTimestamp;
    }

    isInPosition() {
        return !this.lastPosition.get("isFinal");
    }

    getCurrentSide() {
        return this.lastPosition.getCurrentSide();
    }

    openLong() {
        this.logger.write(
            "Adding LONG position at price " + this.getCurrentPrice() + "."
        );
    }

    openShort() {
        this.logger.write(
            "Adding SHORT position at price " + this.getCurrentPrice() + "."
        );
    }

    closePosition() {
        this.logger.write(
            "Closing position at price " + this.getCurrentPrice() + "."
        );
    }

    run() {
        console.log("this needs to ne overwritten");
    }
}

module.exports = AbstractStrategy;
