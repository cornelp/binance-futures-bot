const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Support/Indicators");

class ScalpingStochastic extends AbstractStrategy {
    run() {
        const data = this.getCandleData().mapIntoField("close");

        this.so = indicators.stochasticOscillator(data);

        this.ema50 = indicators.ema(data, 50);
        this.ema200 = indicators.ema(data, 200);

        this.currentEma50 = this.ema50[this.ema50.length - 1];
        this.currentEma200 = this.ema200[this.ema200.length - 1];
        this.currentPrice = this.getCurrentPrice();
    }

    isSignalLong() {
        const isEmaUnder = this.currentEma50 < this.currentEma200;

        const isSoAboveLevel =
            this.so[this.so.length - 1] > this.getConfig("stochasticBuyLevel");

        return (
            isEmaUnder &&
            this._isPriceNearEma(this.currentEma50) &&
            this._isPriceNearEma(this.currentEma200) &&
            isSoAboveLevel
        );
    }

    isSignalShort() {
        const isEmaAbove = this.currentEma50 > this.currentEma200;

        const isSoBelowLevel =
            this.so[this.so.length - 1] < this.getConfig("stochasticSellLevel");

        return (
            isEmaAbove &&
            this._isPriceNearEma(this.currentEma200) &&
            this._isPriceNearEma(this.currentEma50) &&
            isSoBelowLevel
        );
    }

    canClosePosition() {
        return this.profitTrigger() || this.stopLossTrigger();
    }

    _isPriceNearEma(ema) {
        return (
            Math.abs((this.currentPrice - ema) / this.currentPrice) <
            this.getConfig("pricePercentNearEma")
        );
    }
}

module.exports = ScalpingStochastic;
