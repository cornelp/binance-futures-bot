const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Indicators");

class TalonSniperStrategy extends AbstractStrategy {
    constructor(client, lastPosition, logger) {
        super(client, lastPosition, logger);

        // don't really know what this stands for
        this.factor = 1;
    }

    isSignalOkForShortOrLong() {
        if (this.multiScaleSignal[this.multiScaleSignal.length - 2] === -1) {
            this.openShort();
        }

        if (this.multiScaleSignal[this.multiScaleSignal.length - 2] === 1) {
            this.openLong();
        }
    }

    isSignalOkForClosingPosition() {
        if (
            this.multiScaleSignal[this.multiScaleSignal.length - 2] !==
            this.getCurrentSide()
        ) {
            this.closePosition();
        }
    }

    run() {
        this.ha = indicators.heikinAshi(this.candleData);

        this.setIsBusy(false);

        this.multiScaleSignal = this.getMultiScaleSignal();

        // if not in position
        // if -2 position === -1, open SHORT; if -2 position === 1, open LONG
        // if in position
        // if -2 position !== side (1 BUY, -1 SELL), close position

        this.isInPosition() === false
            ? this.isSignalOkForShortOrLong()
            : this.isSignalOkForClosingPosition();
    }

    getMultiScaleSignal() {
        const averageTrueRange = this.getAverageTrueRange();

        const upsAndDowns = this.ha.slice(1).reduce(
            (acc, item, index) => {
                const avg = (item.high + item.low) / 2;

                acc.up.push(avg - this.factor * averageTrueRange[index]);
                acc.down.push(avg + this.factor * averageTrueRange[index]);

                return acc;
            },
            { up: [], down: [] }
        );

        const trendUpsAndDowns = this.ha.slice(1).reduce(
            (acc, item, index, arr) => {
                if (index === 0) return acc;

                const upValue =
                    arr[index - 1].close > (acc.trendUp[index - 1] || 0)
                        ? Math.max(
                              upsAndDowns.up[index],
                              acc.trendUp[index - 1]
                          )
                        : upsAndDowns.up[index];

                acc.trendUp.push(upValue);

                const downValue =
                    arr[index - 1].close < (acc.trendDown[index - 1] || 0)
                        ? Math.min(
                              upsAndDowns.down[index],
                              acc.trendDown[index - 1]
                          )
                        : upsAndDowns.down[index];

                acc.trendDown.push(downValue);

                return acc;
            },
            { trendUp: [], trendDown: [] }
        );

        let last;

        return this.ha
            .slice(1)
            .reduce((acc, item, index, arr) => {
                if (index === 0) return acc;

                let tr;

                if (item.close > trendUpsAndDowns.trendDown[index - 1]) {
                    tr = 1;
                    last = tr;
                } else if (item.close < trendUpsAndDowns.trendUp[index - 1]) {
                    tr = -1;
                    last = tr;
                } else {
                    tr = last;
                }

                acc.push(tr);

                return acc;
            }, [])
            .reduce((acc, item, index, arr) => {
                if (index === 0) return acc;

                if (item === 1 && arr[index - 1] === -1) {
                    acc.push(1);
                    last = 1;
                } else if (index === -1 && arr[index - 1] === 1) {
                    acc.push(-1);
                    last = -1;
                } else {
                    acc.push(last);
                }

                return acc;
            }, [])
            .map((item) => (item === -1 ? -1 : item === 1 ? 1 : 0));
    }

    getAverageTrueRange() {
        const result = this.ha.map((item, index, arr) => {
            if (index === 0) return null;

            return Math.max(
                item.high - item.low,
                Math.abs(item.high - arr[index - 1].close),
                Math.abs(item.low - arr[index - 1].close)
            );
        });

        // remove the first null element
        result.shift();

        return result;
    }

    calculateMultiScaleSignal() {}
}

module.exports = TalonSniperStrategy;
