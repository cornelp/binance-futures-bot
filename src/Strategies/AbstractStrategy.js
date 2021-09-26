const LastPosition = require("./../Support/Strategies/LastPosition");
const StrategyConfig = require("../Support/Strategies/StrategyConfig");
const CandleDataHelper = require("../Support/Strategies/CandleDataHelper");

class AbstractStrategy {
  constructor() {
    this.BUY = 1;
    this.SELL = -1;

    this.lastPosition = new LastPosition(this.constructor.name);
    this.config = new StrategyConfig(this.constructor.name);
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

  getCurrentSide() {
    let type = this.getLastPosition("type");
    const isFinal = this.getLastPosition("isFinal");

    if (isFinal) return type * -1;

    if (!type) return this.BUY;

    return type;
  }

  isCurrentSide(type = "BUY") {
    let configType = this.getLastPosition("type");

    if (configType === undefined) {
      configType = this.BUY;
    }

    return configType === this[type.toUpperCase()];
  }

  isCoinInPosition(coin) {
    const symbol = this.getLastPosition("symbol");

    return symbol === coin;
  }

  isInPosition(coin) {
    const isFinal = this.getLastPosition("isFinal");

    if (isFinal === undefined) {
      return false;
    }

    return !isFinal;
  }

  getQuantity(price, stepSize) {
    if (!this.getConfig("isFinal")) {
      return this.getLastPosition("quantity");
    }

    console.log("price", this.candleDataHelper.getCurrentPrice());

    return (
      this.getConfig("amount") / this.candleDataHelper.getCurrentPrice()
    ).toFixed(stepSize);
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
