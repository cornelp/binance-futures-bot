const Binance = require("node-binance-api");
// const Strategy = require("./src/Strategies/MomentumStrategy");
const Strategy = require("./src/Strategies/HeikinAshiStrategy");
const LastPosition = require("./src/Logic/LastPosition");
const BinanceWrapper = require("./src/Logic/BinanceWrapper");

const binance = new Binance().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,

    test: process.env.IS_TEST,
});

let client = new BinanceWrapper(binance);
let strategy = new Strategy();

client
    .fetchExchangeInfo(strategy.getConfig("symbol"))
    .listenToChart(
        strategy.getConfig("interval"),
        strategy.getConfig("candleCount"),
        (symbol, interval, data) => {
            strategy.setCandleData(data, () => strategy.calculate());

            //
        }
    );
