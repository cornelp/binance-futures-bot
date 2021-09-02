const Binance = require("node-binance-api");
const Strategy = require("./src/Strategies/MacdAndEmaStrategy.js");

const binance = new Binance().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,

    test: process.env.IS_TEST,
});

let strategy = new Strategy(binance);

strategy.bootstrap();
