const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");

class TalonSniperStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    isSignalShort() {
        return this.multiScaleSignal[this.multiScaleSignal.length - 2] === -1;
    }

    isSignalLong() {
        return this.multiScaleSignal[this.multiScaleSignal.length - 2] === 1;
    }

    isCloseNeeded() {
        return (
            this.multiScaleSignal[this.multiScaleSignal.length - 2] !==
            this.getCurrentSide()
        );
    }

    run() {
        this.logger.write("--------------------");
        this.logger.write("Got new candle data");

        this.ha = indicators.heikinAshi(this.candleData);

        this.logger.write("Made Heikin Ashi");
    }
}

module.exports = TalonSniperStrategy;
