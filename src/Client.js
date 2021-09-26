class Client {
  constructor() {
    this.coins = {};

    this.candleCount = 200;

    return this;
  }

  _setCandleCount(candleCount) {
    if (this.candleCount < candleCount) {
      this.candleCount = candleCount;
    }
  }

  setStrategies(strategies) {
    this.coins = strategies.reduce((acc, strategy) => {
      // get maximum candle count
      this._setCandleCount(strategy.getConfig("candleCount"));

      strategy.getCoins().forEach((coin) => {
        if (!acc[coin]) acc[coin] = [];

        acc[coin].push(strategy);
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
    await this._fetchExchangeInfo(coinKeys);

    while (true) {
      for (let i = 0; i < coinKeys.length; i++) {
        const coin = coinKeys[i];

        const candleData = await this.exchangeClient.fetchCandle(
          coin,
          this.candleCount
        );

        this.coins[coin].forEach((strategy) => {
          strategy.bootstrap(candleData);

          this._interogate(strategy, coin);
        });

        await this._timeout(10 * 1000);
      }
    }
  }

  async _fetchExchangeInfo(coins) {
    this.exchangeInfo = await this.exchangeClient.fetchExchangeInfo(coins);
  }

  _interogate(strategy, coin) {
    const stepSize = this.exchangeInfo[coin].stepSize;

    if (strategy.isInPosition()) {
      if (strategy.isCoinInPosition(coin) && strategy.canClosePosition()) {
        this.exchangeClient.closePosition(
          coin,
          strategy.getQuantity(coin, stepSize)
        );
      }

      return;
    }

    if (strategy.isSignalLong()) {
      this.exchangeClient.openLong(coin, strategy.getQuantity(coin, stepSize));

      return;
    }

    if (strategy.isSignalShort()) {
      this.exchangeClient.openShort(coin, strategy.getQuantity(coin, stepSize));
    }
  }
}

module.exports = Client;
