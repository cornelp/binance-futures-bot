const fs = require("fs");
const path = require("path");

class LastPosition {
  constructor(forCls) {
    const logName = forCls
      .split(/(?=[A-Z]+)/)
      .map((item) => item.toLowerCase())
      .join("-");

    const logPath = path.join(__dirname, `/../../../log/${logName}/`);

    this.checkIfExists(logPath, true);

    this.actionLog = logPath + "action.log";
    this.lastPositionLog = logPath + "last-position.json";
    this.transactionsLog = logPath + "transactions.log";

    this.checkIfExists(this.actionLog, false, "");
    this.checkIfExists(this.lastPositionLog, false, "{}");

    this.loadLastPosition();
  }

  loadLastPosition() {
    this.lastPosition = JSON.parse(
      fs.readFileSync(this.lastPositionLog, "utf-8")
    );
  }

  checkIfExists(path, isDir = false, defaultValue = "") {
    if (!fs.existsSync(path)) {
      isDir
        ? fs.mkdirSync(path, { recursive: true })
        : fs.writeFileSync(path, defaultValue);
    }
  }

  setLastPosition(values) {
    this.lastPosition = Object.assign({}, this.lastPosition, values);

    fs.writeFileSync(
      this.lastPositionLog,
      JSON.stringify(this.lastPosition, null, 2),
      "utf-8"
    );

    let message =
      values.hasOwnProperty("isFinal") && values.isFinal === true
        ? `Closing position ${this.lastPosition.symbol}; qty ${this.lastPosition.quantity}; price ${this.lastPosition.price}`
        : `Type: ${this.lastPosition.type === 1 ? "LONG" : "SHORT"}; price ${
            this.lastPosition.price
          }; symbol ${this.lastPosition.symbol}; quantity ${
            this.lastPosition.quantity
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

  get(name) {
    return this.lastPosition[name];
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

module.exports = LastPosition;
