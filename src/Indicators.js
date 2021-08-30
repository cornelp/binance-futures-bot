module.exports = {
    heikinAshi: (candleData) => {
        // fix index from timestamp to [0,1,2]
        ha = Object.values(candleData)
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
        const rs = Object.keys(candleData).reduce(
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

    ema(data, length) {
        const k = 2 / (length + 1);

        if (!data.hasOwnProperty("length")) {
            data = Object.keys(data).reduce((acc, index) => {
                acc.push(parseFloat(data[index].close));
                return acc;
            }, []);
        } else if (data[0].hasOwnProperty("close")) {
            data = data.map((item) => item.close);
        }

        const subArr = data.slice(data.length - length);

        return subArr.reduce((acc, item, index) => {
            let previousEma =
                index > 0
                    ? acc[index - 1]
                    : subArr.reduce((acc, item) => (acc += item), 0) / length;

            acc.push(k * (item - previousEma) + previousEma);

            return acc;
        }, []);
    },
};
