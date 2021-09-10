const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");

class Logger {
    constructor(forCls) {
        this.BUY = 1;
        this.SELL = -1;

        const logName = forCls
            .split(/(?=[A-Z]+)/)
            .map((item) => item.toLowerCase())
            .join("-");

        const logPath = path.join(__dirname, `/../../log/${logName}/`);

        this.checkIfExists(logPath, true);

        this.actionLog = logPath + "action.log";
        this.lastPositionLog = logPath + "last-position.json";
        this.transactionsLog = logPath + "transactions.log";

        this.checkIfExists(this.actionLog, false, "");
        this.checkIfExists(this.lastPositionLog, false, "{}");

        this.loadConfiguration();
    }

    checkIfExists(path, isDir = false, defaultValue = "") {
        if (!fs.existsSync(path)) {
            isDir
                ? fs.mkdirSync(path, { recursive: true })
                : fs.writeFileSync(path, defaultValue);
        }
    }

    wrapToTimestamp(data, title) {
        return (
            "[" +
            dayjs().format("DD.MM.YYYY HH:mm:ss") +
            "] " +
            (title ? `[${title.toUpperCase()}] ` : "") +
            data +
            ".\n"
        );
    }

    write(data, title = null) {
        data = this.wrapToTimestamp(data, title);

        fs.appendFile(this.actionLog, data, (err, data) => {
            if (err) throw err;
        });
    }

    loadConfiguration() {
        this.config = JSON.parse(
            fs.readFileSync(this.lastPositionLog, "utf-8")
        );
    }

    setLastPosition(values) {
        this.config = Object.assign({}, this.config, values);

        fs.writeFileSync(
            this.lastPositionLog,
            JSON.stringify(this.config, null, 2),
            "utf-8"
        );

        let message =
            values.hasOwnProperty("isFinal") && values.isFinal === true
                ? `Closing position on ${this.config.symbol} qty ${this.config.quantity}, price ${this.config.price}`
                : `Type: ${this.config.type === 1 ? "LONG" : "SHORT"} price ${
                      this.config.price
                  } symbol ${this.config.symbol} quantity ${
                      this.config.quantity
                  }`;

        // also adding to transactions.log
        fs.appendFile(
            this.transactionsLog,
            this.wrapToTimestamp(message),
            (err, data) => {
                if (err) throw err;
            }
        );
    }

    get(value = null) {
        return value ? this.config[value] : this.config;
    }

    getCurrentSide() {
        let type = this.get("type");
        const isFinal = this.get("isFinal");

        if (isFinal) return type * -1;

        if (!type) return this.BUY;

        return type;
    }

    isCurrentSide(type = "BUY") {
        let configType = this.get("type");

        if (configType === undefined) {
            configType = this.BUY;
        }

        return configType === this[type.toUpperCase()];
    }

    isInPosition() {
        const isFinal = this.get("isFinal");

        if (isFinal === undefined) {
            return false;
        }

        return !isFinal;
    }
}

module.exports = Logger;
