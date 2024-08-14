/**
 * This file is used to override the default console behavior
 * in order to send the logs to the splunk server.
 */

const SPLUNK_URL = new URL('/proxy/splunk/', window.location.origin).href;

/**
 * Send the log message to the splunk server.
 *
 * @typedef {import("../../stores/UserStore").UserStoreLocalStorage} UserStore;
 * @param {any} message Message to log, this can be any type.
 * @param {"INFO"|"ERROR"|"WARN"} severity Severity of the log message.
 */
function logger(message, severity) {
  try {
  /** @type UserStore */
    const store = JSON.parse(localStorage.getItem('UserStore')) || {};

    const environment = store?.env || 'unset';
    const username = store?.whoami?.username || 'unset';

    fetch(SPLUNK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({
        event: {
          message,
          severity,
          environment,
          username,
        },
        sourcetype: 'osim',
      },
      getCircularReplacer()),
    });
  } catch (e) {
    // We have to use window.console.error here because we are overriding the console.error
    window.console.error('Failed to send log to splunk', e);
  }
}

function formatMessage(args) {
  if (typeof args === 'string') {
    return args;
  }

  if (Array.isArray(args) && args.length === 1) {
    return args[0];
  }

  return args;
}

/**
 * This handles circular references for JSON.stringify.
 * Vue refs are circular references and will cause JSON.stringify to throw an error.
 */
function getCircularReplacer() {
  const ancestors = [];
  return function (key, value) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    // `this` is the object that value is contained in,
    // i.e., its direct parent.
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return '[Circular]';
    }
    ancestors.push(value);
    return value;
  };
}

export function log() {
  const message = formatMessage(Array.from(arguments));
  logger(message, 'INFO');
}

export function error() {
  const message = formatMessage(Array.from(arguments));
  logger(message, 'ERROR');
}

export function warn() {
  const message = formatMessage(Array.from(arguments));
  logger(message, 'WARN');
}
