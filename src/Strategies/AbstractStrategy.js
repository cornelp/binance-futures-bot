const Logger = require("./../Logic/Logger.js");

class AbstractStrategy {
    constructor(client) {
        this.loadConfiguration();
        this.previousPrices = [];

        this.setIsBusy(true);

        this.client = client;
        this.logger = new Logger(this.constructor.name);

        this.candleMap = {
            timestamp: 0,
            open: 1,
            high: 2,
            low: 3,
            close: 4,
            volume: 5,
            closeTime: 6,
            quoteAssetVolume: 7,
            numberOfTrades: 8,
            takerBuyBaseVolume: 9,
            takerBuyQuoteVolume: 10,
        };

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

        setInterval(() => this.selectCoinAndRun(), 25000);
    }

    getCurrentCoin() {
        return this.coins[this.currentCoin];
    }

    selectNextCoin() {
        this.currentCoin =
            typeof this.currentCoin === "undefined" ||
            this.currentCoin >= this.coins.length - 1
                ? 0
                : this.currentCoin + 1;

        console.log("Current coin index is " + this.currentCoin);
        console.log("Current coin is " + this.getCurrentCoin());
    }

    async selectCoinAndRun() {
        // stop if someone got stuck
        if (this.isBusy) {
            return;
        }

        this.setIsBusy(true);

        this.selectNextCoin();

        this.fetchExchangeInfo();

        // stop is there is action in another area
        if (this.isLockedBy && this.isLockedBy !== this.getCurrentCoin()) {
            // we don't know for how long we are in locked state
            // therefore, we cannot rely on candleData anymore
            this.candleData[this.currentCoin] = [];
            return;
        }

        // determine candle count
        const candleCount =
            this.getCurrentCandleData() && this.getCurrentCandleData().length
                ? this.getConfig("refreshCandleCount")
                : this.getConfig("candleCount");

        // fetch data
        const data = await this.client.futuresCandles(
            this.getCurrentCoin(),
            this.getConfig("interval"),
            { limit: candleCount }
        );

        // if we have fresh data, run child run()
        if (this.setCurrentCandleData(data)) {
            console.log("calling run()");
            this.run();
        }

        // logic for position
        if (this.isInPosition()) {
            return this.canClosePosition() && this.closePosition();
        }

        if (this.isSignalLong()) {
            return this.openLong();
        }

        if (this.isSignalShort()) {
            return this.openShort();
        }

        this.setIsBusy(false);
    }

    fetchExchangeInfo() {
        const symbol = this.getCurrentCoin();

        if (!this.exchangeInfo) {
            this.exchangeInfo = [];
        }

        if (this.exchangeInfo[symbol]) {
            return false;
        }

        this.client.exchangeInfo((err, data) => {
            if (err) {
                console.log(err);
                return;
            }

            let info = data.symbols.find((item) => item.symbol === symbol);

            if (!info) {
                console.log("Symbol " + symbol + " not found.");
                return;
            }

            this.exchangeInfo[symbol] = info;
        });
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

        const lastTimestamp = parseInt(
            data[data.length - 1][this.candleMap["timestamp"]]
        );

        // check if timestamp has changed
        if (!this.isCandleTimestampChanged(lastTimestamp)) {
            return false;
        }

        if (this.candleData[this.currentCoin].length) {
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

        if (!field) {
            return data;
        }

        const index = this.candleMap[field];

        return data.map((item) => parseFloat(item[index]));
    }

    setIsBusy(status = true) {
        console.log("setting busy status to " + status);
        this.isBusy = status;
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
        return this.getCandleData(0, "close");
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

        return candle[this.candleMap[prop]];
    }

    openLong() {
        this.logger.write(
            `Adding LONG position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`
        );

        if (this.getConfig("isTest")) {
            return;
        }

        this.setIsBusy(true);

        const qty = (this.getConfig("amount") / this.getCurrentPrice()).toFixed(
            this.fetchFixedStep()
        );

        // symbol, qty
        this.client
            .futuresMarketBuy(this.getCurrentCoin(), qty)
            .then((data) => {
                this.setIsBusy(false);

                this.logger.setLastPosition({
                    type: 1,
                    price: this.getCurrentPrice(),
                    symbol: this.getCurrentCoin(),
                    qty,
                    orderId: data.orderId,
                    isFinal: false,
                });
            });
    }

    openShort() {
        this.logger.write(
            `Adding SHORT position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`
        );

        // if we want to test things out,
        // we only log data to action.log
        if (this.getConfig("isTest")) {
            return;
        }

        this.setIsBusy(true);

        const qty = (this.getConfig("amount") / this.getCurrentPrice()).toFixed(
            this.fetchFixedStep()
        );

        // symbol, qty
        this.client
            .futuresMarketSell(this.getCurrentCoin(), qty)
            .then((data) => {
                this.logger.write(data);

                this.logger.setLastPosition({
                    type: -1,
                    price: this.getCurrentPrice(),
                    symbol: this.getCurrentCoin(),
                    qty,
                    orderId: data.orderId,
                    isFinal: false,
                });

                this.setIsBusy(false);
            });
    }

    closePosition() {
        this.logger.write(
            `Closing position at price ${this.getCurrentPrice()} for ${this.getCurrentCoin()}`
        );

        if (this.getConfig("isTest")) {
            return;
        }

        this.setIsBusy(true);

        this.client.futuresCancel(
            this.getCurrentCoin(),
            {
                orderId: this.logger.get("orderId"),
            },
            (err, response, symbol) => {
                if (!err) this.setIsBusy(false);

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

    canClosePosition() {
        this.logger.isCurrentSide("SELL")
            ? this.isSignalLong()
            : this.isSignalShort();
    }
}

module.exports = AbstractStrategy;
