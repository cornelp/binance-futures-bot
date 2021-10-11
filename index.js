const Client = require("./src/Client");
// const Binance = require("./src/Exchanges/Binance");
const Exchange = require("./src/Exchanges/Paper");
const Strategy = require("./src/Strategies/ScalpingStochastic");
const Logger = require("./src/Support/Logger");

require("dotenv").config();

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

new Client()
    .setLogger(new Logger())
    .setExchangeClient(new Exchange(apiKey, apiSecret))
    .setStrategy(new Strategy())
    .run();
