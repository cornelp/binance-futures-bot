const fs = require("fs");

class StrategyConfig {
  constructor(forCls) {
    this.loadConfig(forCls);
  }

  loadConfig(name) {
    this.configName = name
      .match(/[A-Z][a-z]+/g)
      .map((item) => item.toLowerCase())
      .join("-");

    this.config = Object.assign(
      {},
      require("./../../../config/default"),
      require("./../../../config/" + this.configName)
    );
  }

  mergeConfig(config) {
    this.config = Object.assign({}, this.config, config);

    fs.writeFileSync();
  }

  get(index = null) {
    return index ? this.config[index] : this.config;
  }
}

module.exports = StrategyConfig;
