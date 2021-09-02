const Binance = require("node-binance-api");
const Strategy = require("./src/Strategies/MacdAndEmaStrategy.js");
const BinanceWrapper = require("./src/Logic/BinanceWrapper.js");

const binance = new Binance().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,

    test: process.env.IS_TEST,
});

// let client = new BinanceWrapper(binance);

let strategy = new Strategy(binance);

strategy.bootstrap();
