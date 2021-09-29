class Client {
    constructor() {
        this.coins = {};

        this.candleCount = 0;

        return this;
    }

    _setCandleCount(candleCount) {
        if (this.candleCount < candleCount) {
            this.candleCount = candleCount;
        }
    }

    setLogger(logger) {
        this.logger = logger;

        return this;
    }

    _addToLog(message, title = null) {
        if (!this.logger) {
            return;
        }

        this.logger.write(message, title);

        console.log(`${message}, ${title || ""}`);
    }

    setStrategies(strategies) {
        this.coins = strategies.reduce((acc, strategy) => {
            // get maximum candle count
            this._setCandleCount(strategy.getConfig("candleCount"));

            this._addToLog(
                `Started ${
                    strategy.constructor.name
                } hash ${strategy.getFullConfigName()}`,
                "introduction"
            );

            strategy.getCoins().forEach((coin) => {
                if (!acc[coin]) acc[coin] = {};

                const interval = strategy.getIntervalForCoin(coin);

                if (!acc[coin][interval]) acc[coin][interval] = [];

                acc[coin][interval].push(strategy);
            });

            return acc;
        }, {});

        return this;
    }

    setExchangeClient(wrapper) {
        this.exchangeClient = wrapper;

        return this;
    }

    _timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async run() {
        const coinKeys = Object.keys(this.coins);

        // fetch exchangeInfo
        this.exchangeInfo = await this.exchangeClient.fetchExchangeInfo(
            coinKeys
        );

        while (true) {
            for (let i = 0; i < coinKeys.length; i++) {
                const coin = coinKeys[i];

                // this.addToLog("Running", coin);

                const intervals = Object.keys(this.coins[coin]);

                for (let j = 0; j < intervals.length; j++) {
                    const interval = intervals[j];
                    let candleData = [];

                    try {
                        candleData = await this.exchangeClient.fetchCandle(
                            coin,
                            interval,
                            this.candleCount
                        );
                    } catch (e) {
                        // simply retry
                        candleData = await this.exchangeClient.fetchCandle(
                            coin,
                            interval,
                            this.candleCount
                        );
                    }

                    this.coins[coin][interval].forEach((strategy) => {
                        strategy.bootstrap(candleData);

                        this._interogate(strategy, coin);
                    });

                    await this._timeout(10 * 1000);
                }
            }
        }
    }

    _interogate(strategy, coin) {
        const stepSize = this.exchangeInfo[coin].stepSize;

        // this.addToLog(
        //     `Interogating ${
        //         strategy.constructor.name
        //     }, price is ${strategy.getCurrentPrice()}`
        // );

        if (strategy.isInPosition()) {
            if (
                strategy.isCoinInPosition(coin) &&
                strategy.canClosePosition()
            ) {
                const quantity = strategy.getQuantity(coin, stepSize);

                if (strategy.getConfig("isTest")) {
                    strategy.setLastPosition(
                        { price: strategy.getCurrentPrice() },
                        null,
                        true
                    );

                    this._addToLog(
                        `We can close position on ${coin}, strategy ${strategy.getFullConfigName()}`,
                        "close-position"
                    );
                    return;
                }

                this.exchangeClient
                    .closePosition(
                        coin,
                        strategy.isCurrentSide("SELL") ? "BUY" : "SELL"
                    )
                    .then(() =>
                        strategy.setLastPosition(
                            { price: strategy.getCurrentPrice() },
                            null,
                            true
                        )
                    );
            }

            return;
        }

        if (strategy.isSignalLong()) {
            const quantity = strategy.getQuantity(coin, stepSize);

            if (strategy.getConfig("isTest")) {
                strategy.setLastPosition(
                    {
                        symbol: coin,
                        quantity,
                        price: strategy.getCurrentPrice(),
                    },
                    strategy.BUY,
                    false
                );

                this._addToLog(
                    `Signal is long, coin ${coin}, strategy ${strategy.getFullConfigName()}`,
                    "enter-position"
                );
                this._addToLog(
                    `- currently in a position, ${
                        strategy.isCurrentSide("BUY") ? "LONG" : "SHORT"
                    }`,
                    strategy.getLastPosition("symbol")
                );
                this._addToLog(`- TP at ${strategy.getTakeProfitPrice()}`);
                this._addToLog(`- SL at ${strategy.getStopLossPrice()}`);

                return;
            }

            this.exchangeClient
                .openLong(coin, quantity)
                .then((response) =>
                    strategy.setLastPosition(response, strategy.BUY, false)
                );

            return;
        }

        if (strategy.isSignalShort()) {
            const quantity = strategy.getQuantity(coin, stepSize);

            if (strategy.getConfig("isTest")) {
                strategy.setLastPosition(
                    {
                        symbol: coin,
                        quantity,
                        price: strategy.getCurrentPrice(),
                    },
                    strategy.SELL,
                    false
                );

                this._addToLog(
                    `Signal is short, coin ${coin}, strategy, ${strategy.getFullConfigName()}`,
                    "enter-position"
                );
                this._addToLog(
                    `- currently in a position, ${
                        strategy.isCurrentSide("BUY") ? "LONG" : "SHORT"
                    }`,
                    strategy.getLastPosition("symbol")
                );
                this._addToLog(`- TP at ${strategy.getTakeProfitPrice()}`);
                this._addToLog(`- SL at ${strategy.getStopLossPrice()}`);

                return;
            }

            this.exchangeClient.openShort(coin, quantity).then((response) => {
                const data = Object.assign({}, response, {
                    price: strategy.getCurrentPrice(),
                });

                strategy.setLastPosition(data, strategy.SELL, false);
            });
        }
    }
}

module.exports = Client;
