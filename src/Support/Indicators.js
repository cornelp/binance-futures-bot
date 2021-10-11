const _ = require("lodash");

module.exports = {
    heikinAshi: (candleData) => {
        // fix index from timestamp to [0,1,2]
        ha = candleData
            .map((item) => ({
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                open: parseFloat(item.open),
                close: parseFloat(item.close),
            }))
            .map((data, index, arr) => {
                const previousData = index > 0 ? arr[index - 1] : data;

                const close =
                    (data.open + data.high + data.low + data.close) / 4;

                const open = (previousData.open + previousData.close) / 2;

                const response = {
                    close,
                    open,
                    high: Math.max(data.high, close, open),
                    low: Math.min(data.low, close, open),
                };

                return response;
            });

        // remove first and last candle info data,
        // first does - not have prior data needed for HA calculations
        ha.shift();

        // remove last info data
        // ha.pop();

        return ha;
    },

    rsi(candleData, candleCount) {
        const rs = candleData.reduce(
            (acc, key) => {
                if (candleData[key].open > candleData[key].close) {
                    acc.loss++;
                }

                if (candleData[key].open < candleData[key].close) {
                    acc.gain++;
                }

                return acc;
            },
            { gain: 0, loss: 0 }
        );

        return (
            100 - 100 / (1 + rs.gain / candleCount / (rs.loss / candleCount))
        );
    },

    sma(data, length = null) {
        if (!length) length = data.length;

        return data
            .map((item, index) => {
                if (index < length) return null;

                const sum = data
                    .slice(index - length, index)
                    .reduce((acc, item) => (acc += item), 0);

                return sum / length;
            })
            .filter((item) => item);
    },

    ema(data, length = null) {
        if (!length) length = data.length;

        // take another
        const sma = _.sum(_.take(data, length)) / length;

        const k = 2 / (length + 1);

        return data.slice(length - 1).reduce((acc, item, index) => {
            if (index === 0) {
                acc.push(sma);

                return acc;
            }

            acc.push(item * k + acc[index - 1] * (1 - k));

            return acc;
        }, []);
    },

    wma(data, length = null) {
        if (!length) length = data.length;

        const sumMultiplier = [...Array(length).keys()].reduce(
            (acc, key) => (acc += key + 1),
            0
        );

        return data
            .map((item, index) => {
                if (index < length - 1) return null;

                return data
                    .slice(index - length + 1, index + 1)
                    .reduce((acc, item, index) => {
                        acc += item * ((index + 1) / sumMultiplier);

                        return acc;
                    }, 0);
            })
            .filter((item) => item);
    },

    // hull moving average
    hma(data, length = null) {
        if (!length) length = data.length;

        const wma1 = this.wma(data, Math.floor(length / 2));
        const wma2 = this.wma(data, length);

        const result = _.takeRight(wma2, wma1.length).map((item, index) => {
            return wma2[index] * 2 - item;
        });

        return this.wma(result, Math.floor(Math.sqrt(length)));
    },

    crossOver(crosser, line, interval = 5) {
        crosser = _.takeRight(crosser, interval);
        line = _.takeRight(line, interval);

        let isUnder = false;
        let isCrossed = false;

        crosser.forEach((item, index) => {
            if (item < line[index]) {
                isUnder = true;
                return;
            }

            if (item > line[index] && isUnder) {
                isCrossed = true;
            }
        });

        return isCrossed;
    },

    crossUnder(crosser, line, interval = 5) {
        crosser = _.takeRight(crosser, interval);
        line = _.takeRight(line, interval);

        isOver = false;
        isCrossed = false;

        crosser.forEach((item, index) => {
            if (item > line[index]) {
                isOver = true;
                return;
            }

            if (item < line[index] && isOver) {
                isCrossed = true;
            }
        });

        return isCrossed;
    },

    standardDeviation(seq) {
        let mean =
            seq.reduce((acc, item) => (acc += parseFloat(item)), 0) /
            seq.length;

        let sum = seq
            .map((item) => Math.pow(item - mean, 2))
            .reduce((acc, item) => (acc += item), 0);

        return Math.sqrt((1 / seq.length) * sum);
    },

    rvi(data) {
        return data.map(
            (item) => (item.close - item.open) / (item.high - item.low)
        );
    },

    macd(data) {
        // make 12 period EMA
        const ema12 = this.ema(data, 12);

        // make 26 period EMA
        const ema26 = this.ema(data, 26);

        // make diff
        // 12 EMA - 26 EMA calculate 9 EMA from the result
        const macd = _.takeRight(ema12, ema26.length).map((item, index) => {
            let diff = item - ema26[index];

            // console.log("item", item, "ema26", ema26[index], "diff", diff);

            return diff;
        });

        const signal = this.ema(macd, 9);

        return {
            macd: _.takeRight(macd, signal.length),
            signal,
        };
    },

    stochasticOscillator(data, length = 14) {
        if (data.length && data[0].hasOwnProperty("close")) {
            data = data.map((item) => item.close);
        }

        const result = [];

        for (let i = 0; i < data.length - length; i++) {
            const arrSlice = data.slice(i, i + length);

            const lowestSlice = Math.min(...arrSlice);
            const highestSlice = Math.max(...arrSlice);
            const currentPrice = arrSlice[arrSlice.length - 1];

            result.push(
                ((currentPrice - lowestSlice) / (highestSlice - lowestSlice)) *
                    100
            );
        }

        return result;
    },
};
