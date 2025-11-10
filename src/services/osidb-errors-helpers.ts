export function getDisplayedOsidbError(error: any): string {
  if (error.response) {
    if (error.response.headers?.['content-type']?.startsWith('text/html')) { // OSIDB Server might be in debug mode?
      return parseOsidbHtmlError(error);
    } else {
      const { status, statusText } = error.response;
      return `OSIDB responded with error ${status} (${statusText}). \n` +
        `${
          error.response.data instanceof Object
          // JSON.stringify(error.response.data, null, 2) :
            ? parseOsidbErrorsJson(error.response.data)
            : error.response.data
        }`;
    }
  } else if (error.request) {
    return error.request.toString() === '[object Object]'
      ? JSON.stringify(error.request, null, 2)
      : error.request.toString();
  }
  return parseObjectError(error.request ?? error);
}

function parseObjectError(maybeObject: any): string {
  return maybeObject.toString() === '[object Object]'
    ? JSON.stringify(maybeObject, null, 2)
    : maybeObject.toString();
}

function parseOsidbErrorsJson(data: Record<string, any>) {
  return Object.entries(data)
    .filter(([key]) => !['dt', 'env', 'revision', 'version'].includes(key))
    .map(([key, value]) => {
      const printableValue = value.toString() === '[object Object]' ? JSON.stringify(value, null, 2) : value;
      return `${key}: ${printableValue}`;
    });
}

function parseOsidbHtmlError(error: any) {
  const parser = new DOMParser();
  const contentType = error.response.headers['content-type'];
  const mimeType = contentType?.split(';')[0] || 'text/html';
  const doc = parser.parseFromString(error.response.data, mimeType);
  const exception_value = doc.querySelector('.exception_value'); // May depend on OSIDB being in debug mode?

  const osidbError = ((exception_value as HTMLElement)?.textContent
    ?? (exception_value as HTMLElement)?.innerHTML);
  // eslint-disable-next-line max-len
  const genericErrorMessage = `OSIDB responded with error ${error.response.status} (${error.response.statusText}) for request ${error.response.url}).`;
  const osidbErrorMessage = `OSIDB reported an error: ${osidbError}`;
  return osidbError ? osidbErrorMessage : genericErrorMessage;
}

export function parseOsidbErrors(errors: any[]) {
  return errors.map(getDisplayedOsidbError).join('\n\n');
}
