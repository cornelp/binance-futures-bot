const Binance = require("binance-api-node").default;
const fs = require("fs");

require("dotenv").config();

const binance = new Binance(process.env.API_KEY, process.env.API_SECRET);

binance
    .futuresCandles({
        symbol: "BTCBUSD",
        interval: "1m",
        limit: 1000,
        // startTime: 1633035600,
    })
    .then((response) => {
        const list = response
            .map(
                (item) =>
                    `${item.openTime},${item.open},${item.close},${item.high},${item.low}`
            )
            .join("\n");

        fs.appendFile("./paper-test.csv", list, (err, data) => {
            if (err) throw err;
        });
    });
