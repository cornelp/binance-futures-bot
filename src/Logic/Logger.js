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

    write(data, title = null) {
        data =
            "[" +
            dayjs().format("DD.MM.YYYY HH:mm:ss") +
            "] " +
            (title ? `[${title.toUpperCase()}] ` : "") +
            data +
            ".\n";

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
    }

    get(value = null) {
        return value ? this.config[value] : this.config;
    }

    getCurrentSide() {
        return this.get("type") === this.SELL ? this.SELL : this.BUY;
    }

    isCurrentSide(type = "BUY") {
        let configType = this.get("type");

        if (configType === undefined) {
            configType = this.BUY;
        }

        return configType === this[type.toUpperCase()];
    }
}

module.exports = Logger;
