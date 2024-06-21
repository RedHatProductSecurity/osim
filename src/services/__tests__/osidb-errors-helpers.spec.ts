import {
  getDisplayedOsidbError,
  parseOsidbErrors,
} from '../osidb-errors-helpers';


describe('getDisplayedOsidbError', () => {

  it('should return a string with the error message', () => {
    const error = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: 'Internal Server Error',
      },
    };
    expect(getDisplayedOsidbError(error)).toBe(
      'OSIDB responded with error 500 (Internal Server Error). \nInternal Server Error'
    );
  });

  it('should return a string with the error message when error.response.data is an object', () => {
    const error = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Internal Server Error' },
      },
    };
    expect(getDisplayedOsidbError(error)).toBe(
      'OSIDB responded with error 500 (Internal Server Error). \nerror: Internal Server Error'
    );
  });

  it('should return a string with the error message when error.request is an object', () => {
    const error = {
      request: { error: 'Internal Server Error' },
    };
    const expectJsonStringified = '{\n  "error": "Internal Server Error"\n}';
    expect(getDisplayedOsidbError(error)).toBe(expectJsonStringified);
  });

  it('should return a string with the error message when error.request is **NOT** an object', () => {
    const error = {
      request: 'Internal Server Error',
    };
    expect(getDisplayedOsidbError(error)).toBe('Internal Server Error');
  });
});

describe('parseOsidbErrors', () => {
  it('should return a string with the error message', () => {
    const errors = [
      {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: 'Internal Server Error',
        },
      },
      {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: 'Internal Server Error',
        },
      },
    ];
    expect(parseOsidbErrors(errors)).toBe(
      'OSIDB responded with error 500 (Internal Server Error). \n'
      + 'Internal Server Error\n\nOSIDB responded with error 500 (Internal Server Error). \n'
      + 'Internal Server Error'
    );
  });
});
