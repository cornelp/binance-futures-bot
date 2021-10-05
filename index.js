const Client = require("./src/Client");
const Binance = require("./src/Exchanges/Binance");
const Scalping = require("./src/Strategies/Scalping");
const Logger = require("./src/Support/Logger");

require("dotenv").config();

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

new Client()
    .setLogger(new Logger())
    .setExchangeClient(new Binance(apiKey, apiSecret))
    .setStrategy(new Scalping())
    .run();
