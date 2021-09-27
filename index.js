const Client = require("./src/Client");
const BinanceWrapper = require("./src/Exchanges/BinanceWrapper");
const ScalpingStrategy = require("./src/Strategies/ScalpingStrategy");
const EngulfingStrategy = require("./src/Strategies/EngulfingStrategy");

require("dotenv").config();

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

new Client()
    .setExchangeClient(new BinanceWrapper(apiKey, apiSecret))
    .setStrategies([new ScalpingStrategy(), new EngulfingStrategy()])
    .run();
