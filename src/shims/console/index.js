/**
 * This file is used to override the default console behavior
 * in order to send the logs to the splunk server.
 */

export const error = (...args) => {
  fetch('/proxy/splunk/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({
      message: args,
      severity: 'ERROR',
      metadata: {
        index: 'rh_osidb',
        source: 'osim',
        sourcetype: 'osim',
      },
    }),
  });
};

export const info = (...args) => {
  fetch('/proxy/splunk/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({
      message: args,
      severity: 'INFO',
      metadata: {
        index: 'rh_osidb',
        source: 'osim',
        sourcetype: 'osim',
      },
    }),
  });
};
