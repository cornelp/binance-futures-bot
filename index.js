const Binance = require("binance-api-node").default;
const ScalpingStrategy = require("./src/Strategies/ScalpingStrategy.js");
const Client = require("./src/Client");
//
const binance = Binance({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
});
//
// let strategy = new Strategy(binance);
//
// strategy.bootstrap();
client = new Client(binance);

client
    .setGlobalConfiguration({
        symbol: "ETHUSDT,ADAUSDT",
        interval: "5m",
        candleCount: 200,
    })
    .setStrategies([new ScalpingStrategy()])
    .run();

// for each strategy
// tell it to load the default config or feed one custom instance
// ask for coin, interval and candleCount
// fetch data and feed it to strategy
// then ask:
// - are we currently in a position?
// -- if yes, can we close it?
// --- if yes, ask for the orderId and close the position
// - are we having a long signal?
// - are we having a short signal?
// -- if so, ask for amount, price and set the order - after send the orderId to the strategy
// repeat--
