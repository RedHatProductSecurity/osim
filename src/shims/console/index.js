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
    }),
  });
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
