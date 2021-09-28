const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Support/Indicators");

class ScalpingEmaMacd extends AbstractStrategy {
    run() {
        const candleData = this.getCandleData().mapIntoField("close");

        // calculate EMA(200) and EMA(50) (5m timeframe)
        this.ema200 = indicators.ema(candleData, 200);
        this.ema50 = indicators.ema(candleData, 50);

        // also MACD, taking only histogram into consideration (should be on 1m timeframe)
        this.macd = indicators.macd(candleData);

        // average
        const sum = this.macd.macd.reduce((acc, item) => (acc += item), 0);

        this.macdAverage = sum / this.macd.macd.length;
    }

    isSignalLong() {
        // only when the EMA(50) is above EMA(200)
        // calculate MACD histogram average
        // when the MACD histogram is lower than average
        return (
            this.ema50[this.ema50.length - 1] >
                this.ema200[this.ema200.length - 1] &&
            this.macd.macd[this.macd.macd.length - 1] < this.macdAverage
        );
    }

    isSignalShort() {
        return (
            this.ema50[this.ema50.length - 1] <
                this.ema200[this.ema200.length - 1] &&
            this.macd.macd[this.macd.macd.length - 1] > this.macdAverage
        );
    }

    canClosePosition() {
        return this.profitTrigger() || this.stopLossTrigger();
    }
}

module.exports = ScalpingEmaMacd;
