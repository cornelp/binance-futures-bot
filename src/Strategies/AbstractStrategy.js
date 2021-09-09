const Logger = require("./../Logic/Logger.js");

class AbstractStrategy {
    constructor(client) {
        this.loadConfiguration();
        this.previousPrices = [];

        this.setIsBusy(true);

        this.client = client;
        this.logger = new Logger(this.constructor.name);

        // this.candleMap = {
        //     timestamp: 0,
        //     open: 1,
        //     high: 2,
        //     low: 3,
        //     close: 4,
        //     volume: 5,
        //     closeTime: 6,
        //     quoteAssetVolume: 7,
        //     numberOfTrades: 8,
        //     takerBuyBaseVolume: 9,
        //     takerBuyQuoteVolume: 10,
        // };

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

        this.selectCoinAndRun();

        setInterval(
            () => this.selectCoinAndRun(),
            this.getConfig("runEvery") * 1000
        );
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

        console.log("Current coin index is " + this.currentCoin);
        console.log("Current coin is " + this.getCurrentCoin());

        this.logger.write(`Let's go ${this.getCurrentCoin()}`, "start");
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

        // fetch the exchange info,
        // only if needed
        this.fetchExchangeInfo();

        // stop is there is action in another area
        if (
            this.getIsLockedBy() &&
            this.getIsLockedBy(true) !== this.getCurrentCoin()
        ) {
            if (!this.candleData) this.candleData = [];

            // we don't know for how long we are in locked state
            // therefore, we cannot rely on candleData anymore
            this.candleData = this.candleData.map((item, key) => {
                if (key === this.getCurrentCoin()) return item;

                return [];
            }, this);

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

        // determine candle count
        const candleCount =
            this.getCurrentCandleData() && this.getCurrentCandleData().length
                ? this.getConfig("refreshCandleCount")
                : this.getConfig("candleCount");

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
        if (this.isInPosition()) {
            this.logger.write(
                `We are in a position on ${this.logger.get(
                    "symbol"
                )} and it's a ${
                    this.logger.get("type") == 1 ? "LONG" : "SHORT"
                }`
            );

            return this.canClosePosition() && this.closePosition();
        }

        if (this.isSignalLong()) {
            return this.openLong();
        }

        if (this.isSignalShort()) {
            return this.openShort();
        }

        this.setIsBusy(false);

        this.logger.write(`Finished running with no action`, "debug");
    }

    async fetchExchangeInfo() {
        const symbol = this.getCurrentCoin();

        if (!this.exchangeInfo) {
            this.exchangeInfo = [];
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
            .forEach((item) => (this.exchangeInfo[item.symbol] = item), this);
    }

    isCandleTimestampChanged(lastTimestamp) {
        const timestamp = this.getCandleData(-1, "timestamp");

        return !timestamp || lastTimestamp > timestamp;
    }

    setCurrentCandleData(data) {
        if (!this.candleData) {
            this.candleData = [];
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
        console.log("setting busy status to " + status);
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

    isInPosition() {
        const isFinal = this.logger.get("isFinal");

        if (isFinal === undefined) {
            return false;
        }

        return !isFinal;
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
            `Adding LONG position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`
        );

        this.logger.write(`Fixed step is ${this.getFixedStep()}`, "debug");

        const quantity = (
            this.getConfig("amount") /
            this.getCurrentPrice() /
            this.getConfig("takerFee")
        ).toFixed(this.getFixedStep());

        if (this.getConfig("isTest")) {
            this.logger.setLastPosition({
                type: 1,
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

    openShort() {
        this.logger.write(
            `Adding SHORT position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`
        );

        const quantity = (
            this.getConfig("amount") /
            this.getCurrentPrice() /
            this.getConfig("takerFee")
        ).toFixed(this.getFixedStep());

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
            "close"
        );

        if (this.getConfig("isTest")) {
            this.logger.setLastPosition({
                isFinal: true,
            });

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

    getFixedStep() {
        if (!this.exchangeInfo[this.getCurrentCoin()]) {
            return 0;
        }

        const filter = this.exchangeInfo[this.getCurrentCoin()].filters.find(
            (item) => item.filterType === "LOT_SIZE"
        );

        if (!filter) {
            return 0;
        }

        return Math.max(filter.stepSize.toString().indexOf("1") - 1, 0);
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
    }

    canClosePosition() {
        this.setIsBusy(true);

        const response =
            this.isProfitOrStopLoss() ||
            (this.logger.isCurrentSide("SELL")
                ? this.isSignalLong()
                : this.isSignalShort());

        this.setIsBusy(false);

        return response;
    }
}

module.exports = AbstractStrategy;
