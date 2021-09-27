const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Support/Indicators.js");

class ScalpingStrategy extends AbstractStrategy {
    run() {
        // get sma 5
        const line5 = indicators.sma(
            this.getCandleData().mapIntoField("close"),
            5
        );
        // get sma 8
        const line8 = indicators.sma(
            this.getCandleData().mapIntoField("close"),
            8
        );
        // get sma 13
        const line13 = indicators.sma(
            this.getCandleData().mapIntoField("close"),
            13
        );

        this.crossOver =
            indicators.crossOver(line5, line8) &&
            indicators.crossOver(line5, line13);

        this.crossUnder =
            indicators.crossUnder(line5, line8) &&
            indicators.crossUnder(line5, line13);
    }

    isSignalLong() {
        // when 5 line crosses up on the other two
        return this.crossOver;
    }

    isSignalShort() {
        // when 5 line crosses down on the other two
        return this.crossUnder;
    }

    canClosePosition() {
        if (this.profitTrigger() || this.stopLossTrigger()) {
            return true;
        }

        return this.isCurrentSide("SELL")
            ? this.isSignalLong()
            : this.isSignalShort();
    }
}

module.exports = ScalpingStrategy;
