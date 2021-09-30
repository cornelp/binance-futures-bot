const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Support/Indicators.js");

class Engulfing extends AbstractStrategy {
    run() {
        // get previous and current low price
        // get previous and current close price
        this.previousCandle = this.getCandleData().getCandle(-2);
        this.lastCandle = this.getCandleData().getCandle(-1);
    }

    isSignalLong() {
        // current low < previous low and
        // current close > previous close
        return (
            this.lastCandle.low < this.previousCandle.low &&
            this.lastCandle.close > this.previousCandle.close
        );
    }

    isSignalShort() {
        // current low > previous low and
        // current close < previous close
        return (
            this.lastCandle.low > this.previousCandle.low &&
            this.lastCandle.close < this.previousCandle.close
        );
    }

    canClosePosition() {
        return this.profitTrigger() || this.stopLossTrigger();
    }
}

module.exports = Engulfing;
