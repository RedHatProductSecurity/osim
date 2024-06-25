

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

export function parseOsidbErrors(errors: any[]) {
  return errors.map(getDisplayedOsidbError).join('\n\n');
}


function parseOsidbHtmlError(error: any){
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    error.response.data, error.response.headers['content-type']
  );
  const exception_value = doc.querySelector('.exception_value'); // May depend on OSIDB being in debug mode?

  const text = (exception_value as HTMLElement)?.innerText;

  return 'Likely error between OSIDB and database:\n' + text;
}

function parseOsidbErrorsJson(data: Record<string, any>) {
  return Object.entries(data)
    .filter(([key]) => !['dt', 'env', 'revision', 'version'].includes(key))
    .map(([key, value]) => `${key}: ${value}`);
}
