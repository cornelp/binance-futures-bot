const Binance = require("binance-api-node").default;
const Strategy = require("./src/Strategies/ScalpingStrategy.js");

const binance = Binance({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
});

let strategy = new Strategy(binance);

strategy.bootstrap();
