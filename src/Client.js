class Client {
    constructor(exchangeClient) {
        this.exchangeInfo = [];
        this.exchangeClient = exchangeClient;
        this.coins = [];

        this.strategies = [];
        this.currentStrategy = null; //index of strategy

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

    async run() {
        console.log("started to run");

        await this.fetchExchangeInfo();

        this.runInstance();

        setInterval(() => this.runInstance(), 13000);
    }

    async runInstance() {
        console.log("starting now");

        // select strategy
        const strategy = this.selectStrategy();
        // ask strategy for info
        const info = strategy.getInfo();
        // ask for candle data based on info
        const candleData = await this.exchangeClient.futuresCandles(info);

        strategy.setCurrentCandleData(candleData);

        // check if we're in a position
        if (strategy.isInPosition() && strategy.canClosePosition()) {
            // ask for current orderId
            const orderId = strategy.getLastOrderId();

            // only for test reasons
            // this.getConfig("isTest")
            if (true) {
                strategy.saveClosedPosition();

                // this.setIsBusy(false);

                return;
            }

            // close the position
            this.exchangeClient.futuresCancel(
                info.symbol,
                { orderId },
                (err, response, symbol) => {
                    // if (!err) this.setIsBusy(false);

                    strategy.saveClosedPosition();
                }
            );

            return;
        }

        // check if signal is long
        if (strategy.isSignalLong()) {
            // add position
            console.log("signal is long");

            // let strategy know
        }

        if (strategy.isSignalShort()) {
            // add position
            console.log("signal is short");

            // let strategy know
        }
    }

    selectStrategy() {
        this.currentStrategy =
            this.currentStrategy === null ||
            this.currentStrategy >= this.strategies.length - 1
                ? 0
                : this.currentStrategy + 1;

        return this.strategies[this.currentStrategy];
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
