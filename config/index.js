const config = require('./default.json');

const isObject = x => Object.prototype.toString.call(x) === '[object Object]';
const isString = x => Object.prototype.toString.call(x) === '[object String]';

const replaceEnv = x => (process.env[x] ? process.env[x] : x);

// Replace configuration value with the value of environment variable,
// if environment variable with the same name exists
function mergeWithEnv(originConf) {
  const conf = { ...originConf };

  if (isObject(conf)) {
    Object.keys(conf).forEach(key => {
      if (isObject(conf[key])) {
        conf[key] = mergeWithEnv(conf[key]);
      }

      if (isString(conf[key])) {
        conf[key] = replaceEnv(conf[key]);
      }

      if (Array.isArray(conf[key])) {
        conf[key] = conf[key].map(x => {
          if (isString(x)) {
            return replaceEnv(x);
          }

          return mergeWithEnv(x);
        });
      }
    });
  }

  return conf;
}

module.exports = mergeWithEnv(config);
