const Logger = require("./../Logic/Logger.js");

class AbstractStrategy {
    constructor(client) {
        this.loadConfiguration();
        this.previousPrices = [];

        this.setIsBusy(true);

        this.client = client;
        this.logger = new Logger(this.constructor.name);

        this.setIsBusy(false);
    }

    bootstrap() {
        // read coins
        const symbol = this.getConfig("symbol");

        if (!symbol) {
            this.logger.write("No coin. Nothing to do", "error");
            return;
        }

        this.coins = symbol.split(",");

        if (this.coins.length > 4) {
            // just for better testing, at the moment
            this.logger.write("Cannot run with more than 4 coins", "error");
            return;
        }

        this.fetchExchangeInfo().then((data) => {
            this.selectCoinAndRun();

            setInterval(
                () => this.selectCoinAndRun(),
                this.getConfig("runEvery") * 1000
            );
        });
    }

    getCurrentCoin() {
        return this.coins[this.currentCoin];
    }

    selectNextCoin(index = null) {
        this.currentCoin =
            index === null
                ? typeof this.currentCoin === "undefined" ||
                  this.currentCoin >= this.coins.length - 1
                    ? 0
                    : this.currentCoin + 1
                : index;
    }

    async selectCoinAndRun() {
        // stop if someone got stuck
        if (this.isBusy) {
            this.logger.write(
                `Another action is underway. Cannot selectCoinAndRun. Still waiting.`,
                "busy"
            );

            return;
        }

        // take the next available coin
        this.selectNextCoin();

        // stop is there is action in another area
        if (
            this.getIsLockedBy() &&
            this.getIsLockedBy(true) !== this.getCurrentCoin()
        ) {
            if (!this.candleData) this.candleData = {};

            // we don't know for how long we are in locked state
            // therefore, we cannot rely on candleData anymore
            Object.keys(this.candleData).forEach((key) => {
                if (parseInt(key) !== parseInt(this.logger.get("symbolIndex")))
                    delete this.candleData[key];
            });

            this.logger.write(
                `Currently locked by ${this.logger.get(
                    "symbol"
                )}. Sorry ${this.getCurrentCoin()}, ${this.logger.get(
                    "symbol"
                )} will run instead`,
                "debug"
            );

            this.selectNextCoin(this.logger.get("symbolIndex"));
        }

        this.logger.write(`Let's go ${this.getCurrentCoin()}`, "start");

        // determine candle count
        const candleCount =
            this.getCurrentCandleData() && this.getCurrentCandleData().length
                ? this.getConfig("refreshCandleCount")
                : this.getConfig("candleCount");

        this.logger.write(`Fetching last ${candleCount} candles.`, "info");

        // fetch data
        const data = await this.client.futuresCandles({
            symbol: this.getCurrentCoin(),
            interval: this.getConfig("interval"),
            limit: candleCount,
        });

        // if we have fresh data, run child run()
        if (this.setCurrentCandleData(data)) {
            this.run();
        }

        // logic for position
        if (this.logger.isInPosition()) {
            this.logger.write(
                `We are in a position on ${this.logger.get(
                    "symbol"
                )} and it's a ${
                    this.logger.get("type") == 1 ? "LONG" : "SHORT"
                }`,
                "position"
            );

            return this.canClosePosition() ? this.closePosition() : null;
        }

        if (this.isSignalLong()) {
            return this.openLong();
        }

        if (this.isSignalShort()) {
            return this.openShort();
        }

        this.setIsBusy(false);
    }

    getExchangeInfo(type = null) {
        return type
            ? this.exchangeInfo[this.getCurrentCoin()][type]
            : this.exchangeInfo[this.getCurrentCoin()];
    }

    async fetchExchangeInfo() {
        const symbol = this.getCurrentCoin();

        if (!this.exchangeInfo) {
            this.exchangeInfo = {};
        }

        if (this.exchangeInfo[symbol]) {
            return false;
        }

        this.logger.write(`Fetching exchangeInfo`, "debug");

        const exchangeInfo = await this.client.futuresExchangeInfo();

        if (!exchangeInfo.symbols) {
            return;
        }

        exchangeInfo.symbols
            .filter((item) => this.coins.indexOf(item.symbol) > -1, this)
            .forEach((item) => {
                const stepSize = Math.max(
                    item.filters[1].stepSize.toString().indexOf("1") - 1,
                    0
                );
                const tickSize = Math.max(
                    item.filters[0].tickSize.toString().indexOf("1") - 1,
                    0
                );

                this.exchangeInfo[item.symbol] = {
                    minQty: item.filters[1].minQty,
                    stepSize,
                    tickSize,
                };
            }, this);

        return exchangeInfo;
    }

    isCandleTimestampChanged(lastTimestamp) {
        const timestamp = this.getCandleData(-1, "timestamp");

        return !timestamp || lastTimestamp > timestamp;
    }

    setCurrentCandleData(data) {
        if (!this.candleData) {
            this.candleData = {};
            this.candleData[this.currentCoin] = [];
        }

        const lastTimestamp = parseInt(data[data.length - 1]["closeTime"]);

        // check if timestamp has changed
        if (!this.isCandleTimestampChanged(lastTimestamp)) {
            return false;
        }

        if (
            this.candleData[this.currentCoin] &&
            this.candleData[this.currentCoin].length
        ) {
            // remove first element
            this.candleData[this.currentCoin].shift();

            // inject the last
            this.candleData[this.currentCoin].push(data[data.length - 1]);
        } else {
            // set data
            this.candleData[this.currentCoin] = data;
        }

        return true;
    }

    getCurrentCandleData(field = null) {
        const data = this.candleData ? this.candleData[this.currentCoin] : [];

        if (!field) return data;

        return data.map((item) => parseFloat(item[field]));
    }

    setIsBusy(status = true) {
        this.isBusy = status;
    }

    getIsLockedBy(getCoin = false) {
        const isFinal = this.logger.get("isFinal");

        if (isFinal === undefined || isFinal === true) return false;

        if (!getCoin) return true;

        return this.logger.get("symbol");
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
        return this.getCandleData(-1, "close");
    }

    setPreviousPrices(previousPrices) {
        this.previousPrices = previousPrices;
    }

    getConfig(key) {
        return this.config[key];
    }

    getCurrentSide() {
        return this.logger.getCurrentSide();
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

    openLong() {
        this.logger.write(
            `Adding LONG position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`,
            "transaction"
        );

        if (this.getConfig("isTest")) {
            this.logger.setLastPosition({
                type: 1,
                symbolIndex: this.currentCoin,
                price: this.getCurrentPrice(),
                symbol: this.getCurrentCoin(),
                quantity: this.getQuantity(),
                orderId: "test",
                isFinal: false,
            });

            this.setIsBusy(false);

            return;
        }

        this.setIsBusy(true);

        this.client
            .futuresOrder({
                symbol: this.getCurrentCoin(),
                side: "BUY",
                type: "MARKET",
                quantity,
            })
            .then((data) => {
                this.setIsBusy(false);

                this.logger.setLastPosition({
                    type: 1,
                    symbolIndex: this.currentCoin,
                    price: this.getCurrentPrice(),
                    symbol: this.getCurrentCoin(),
                    quantity,
                    orderId: data.orderId,
                    isFinal: false,
                });
            });
    }

    getQuantity() {
        if (this.logger.isCurrentSide("SELL") && this.logger.isInPosition()) {
            return this.logger.get("quantity");
        }

        // if we want to buy,
        // get the (amount / current price).toFixed(this.getTickSize())
        const quantity = this.getConfig("amount") / this.getCurrentPrice();

        if (quantity < this.getExchangeInfo("minQty")) {
            return 0;
        }

        return quantity.toFixed(this.getExchangeInfo("stepSize"));
    }

    openShort() {
        this.logger.write(
            `Adding SHORT position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`,
            "transaction"
        );

        const quantity = this.getQuantity();

        if (quantity === 0) {
            this.logger.write(`Qty is 0 - not enough amount?`, "debug");

            return;
        }

        // if we want to test things out,
        // we only log data to action.log
        if (this.getConfig("isTest")) {
            this.logger.setLastPosition({
                type: -1,
                symbolIndex: this.currentCoin,
                price: this.getCurrentPrice(),
                symbol: this.getCurrentCoin(),
                quantity,
                orderId: "test",
                isFinal: false,
            });

            this.setIsBusy(false);

            return;
        }

        this.setIsBusy(true);

        this.client
            .futuresOrder({
                symbol: this.getCurrentCoin(),
                side: "SELL",
                type: "MARKET",
                quantity,
            })
            .then((data) => {
                this.logger.write(data);

                this.logger.setLastPosition({
                    type: -1,
                    symbolIndex: this.currentCoin,
                    price: this.getCurrentPrice(),
                    symbol: this.getCurrentCoin(),
                    quantity,
                    orderId: data.orderId,
                    isFinal: false,
                });

                this.setIsBusy(false);
            });
    }

    closePosition() {
        this.logger.write(
            `Closing position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`,
            "transaction"
        );

        if (this.getConfig("isTest")) {
            this.logger.setLastPosition({ isFinal: true });

            this.setIsBusy(false);

            return;
        }

        this.setIsBusy(true);

        this.client.futuresCancel(
            this.getCurrentCoin(),
            {
                orderId: this.logger.get("orderId"),
            },
            (err, response, symbol) => {
                if (!err) {
                    this.setIsBusy(false);
                }

                this.logger.setLastPosition({
                    isFinal: true,
                });
            }
        );
    }

    run() {
        console.log("this needs to be overwritten");
    }

    isSignalLong() {
        console.log("OVERWRITE ME!!");
    }

    isSignalShort() {
        console.log("OVERWRITE ME!!");
    }

    isProfitOrStopLoss() {
        console.log("OVERWRITE ME!!");
        return false;
    }

    canClosePosition() {
        this.setIsBusy(true);

        const response = this.isProfitOrStopLoss();

        this.setIsBusy(false);

        return response;
    }
}

module.exports = AbstractStrategy;
