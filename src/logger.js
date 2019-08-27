const { createLogger, format, transports } = require('winston');

// Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
const replacer = (key, value) => {
  if (value instanceof Error) {
    return { error: { name: value.name, message: value.message, stack: value.stack } };
  }

  if (/password/i.test(key)) {
    return value.replace(/./g, '*');
  }

  return value;
};

const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: 'debug',
  format: format.combine(
    format.splat(),
    format.simple(),
    format.timestamp(),
    format.json({ replacer })
  ),
  transports: [new transports.Console()]
});

module.exports = logger;
