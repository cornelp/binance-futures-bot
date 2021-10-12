const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Support/Indicators");

class EmaAverageTrueRange extends AbstractStrategy {
    run() {
        const candleData = this.getCandleData().getData();

        // EMA 5, 12, 40
        this.ema5 = indicators.ema(candleData, 5, "close");
        this.ema12 = indicators.ema(candleData, 12, "close");
        this.ema40 = indicators.ema(candleData, 40, "close");

        // average true range
        const atr = indicators.averageTrueRange(candleData, 14);

        this.lastAtr = atr[atr.length - 1];
        this.previousAtr = atr[atr.length - 2];
    }

    isSignalLong() {
        const atrTrendConfirmation = this.getConfig("atrTrendConfirmation");

        return (
            this.ema5 > this.ema12 > this.ema40 &&
            this.lastAtr >= atrTrendConfirmation &&
            this.previousAtr >= atrTrendConfirmation
        );
    }
    isSignalShort() {
        return this.ema12 < this.ema40;
    }

    canClosePosition() {
        return this.takeProfitTrigger() || this.stopLossTrigger();
    }
}

module.exports = EmaAverageTrueRange;
