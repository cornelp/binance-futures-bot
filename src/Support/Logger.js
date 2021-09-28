const fs = require("fs");
const dayjs = require("dayjs");

class Logger {
    constructor() {
        this.actionLog = __dirname + "/../../log/action.log";

        this.checkIfExists(this.actionLog);
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
}

module.exports = Logger;
