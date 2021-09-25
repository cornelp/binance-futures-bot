class Client {
    constructor(exchangeClient) {
        this.exchangeInfo = [];
        this.exchangeClient = exchangeClient;
        this.coins = [];

        this.strategies = [];
        this.currentStrategyIndex = null; // index of strategy
        this.currentStrategy = null; // instance

        this.globalConfig = null;
    }

    setGlobalConfiguration(config) {
        this.globalConfig = config;

        return this;
    }

    setStrategies(strategies) {
        if (!strategies.length) {
            return;
        }

        this.strategies = strategies;

        if (this.globalConfig) {
            // inject global config if given
            this.strategies.forEach((strategy) =>
                strategy.setConfiguration(this.globalConfig)
            );
        }

        // get all possible coins from all strategies
        this.coins = this.strategies.reduce((acc, item) => {
            return acc.concat(item.getCoins());

            return acc;
        }, []);

        return this;
    }

    interogateStrategy(info) {
        if (this.currentStrategy.isInPosition()) {
            if (this.currentStrategy.canClosePosition()) {
                // only for test reasons
                if (this.currentStrategy.getConfig("isTest")) {
                    this.currentStrategy.saveClosedPosition();
                    return;
                }

                const type = this.currentStrategy.isCurrentSide("BUY")
                    ? "BUY"
                    : "SELL";

                // close the position
                this.exchangeClient["futuresMarket" + type](
                    info.symbol,
                    this.currentStrategy.getLastAmount(),
                    (err, response, symbol) =>
                        this.currentStrategy.saveClosedPosition()
                );
            }

            return;
        }

        if (!this.currentStrategy.getConfig("isTest")) {
            // set leverage
            this.exchangeClient.futuresLeverage(
                info.symbol,
                this.currentStrategy.getLeverage()
            );

            // set margin type
            this.exchangeClient.futuresMarginType(
                info.symbol,
                this.currentStrategy.getMarginType()
            );
        }

        // check if signal is long
        if (this.currentStrategy.isSignalLong()) {
            // add position
            console.log("signal is long");
            // get quantity
            const quantity = this.currentStrategy.getQuantity(
                this.getExchangeInfo(this.currentStrategy.getCoin())
            );

            // we need to have qty
            if (quantity === 0) return;

            if (this.currentStrategy.getConfig("isTest")) {
                this.currentStrategy.addedLongPosition(quantity);
                return;
            }

            // add order
            this.exchangeClient
                .futuresMarketBuy(this.currentStrategy.getCoin(), quantity)
                .then(({}) => {
                    // let strategy know
                    this.currentStrategy.addedLongPosition(quantity);
                });

            return;
        }

        if (this.currentStrategy.isSignalShort()) {
            // add position
            console.log("signal is short");
            // get quantity
            const quantity = this.currentStrategy.getQuantity(
                this.getExchangeInfo(this.currentStrategy.getCoin())
            );

            // we need to have qty
            if (quantity === 0) return;

            if (this.currentStrategy.getConfig("isTest")) {
                this.currentStrategy.addedShortPosition(quantity);
                return;
            }

            // add order
            this.exchangeClient
                .futuresMarketSell(this.currentStrategy.getCoin(), quantity)
                .then(({}) => {
                    // let strategy know
                    this.currentStrategy.addedShortPosition(quantity);
                });
        }
    }

    async run() {
        await this.fetchExchangeInfo();

        // for every strategy
        while (this.selectStrategy()) {
            console.log("running on", this.currentStrategy.constructor.name);

            let isCoinLast = false;

            while (!isCoinLast) {
                // get info on one coin and candle data
                // wait for confirmation on data retrieval
                await this.fetchCandlesForStrategy(
                    this.currentStrategy.getInfo()
                );

                isCoinLast = this.currentStrategy.isCoinLast();
            }
        }
    }

    timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async fetchCandlesForStrategy(info) {
        const candleData = await this.exchangeClient.futuresCandles(info);
        console.log(`running for ${info.symbol}, fetching ${info.limit}`);

        this.currentStrategy.setCurrentCandleData(candleData);

        this.interogateStrategy(info);

        // we're waiting for another 10 sec,
        // just to be sure we don't get exchange rejection
        // (too many requests)
        await this.timeout(10 * 1000);
    }

    selectStrategy(index = null) {
        if (index) {
            this.currentStrategyIndex = index;
            return;
        }

        this.currentStrategyIndex =
            this.currentStrategyIndex === null ||
            this.currentStrategyIndex >= this.strategies.length - 1
                ? 0
                : this.currentStrategyIndex + 1;

        this.currentStrategy = this.strategies[this.currentStrategyIndex];

        return this.currentStrategy;
    }

    getExchangeInfo(symbol) {
        return this.exchangeInfo[symbol] || null;
    }

    async fetchExchangeInfo() {
        const exchangeInfo = await this.exchangeClient.futuresExchangeInfo();

        if (!exchangeInfo) {
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
    }
}

module.exports = Client;
