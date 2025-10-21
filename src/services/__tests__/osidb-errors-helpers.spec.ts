import {
  getDisplayedOsidbError,
  parseOsidbErrors,
} from '../osidb-errors-helpers';

describe('oSIDB Error helpers', () => {
  // JSDom lacks an innerText implementation since it does not use a layout engine, so we need to mock it
  // Source: https://github.com/jsdom/jsdom/issues/1245
  beforeAll(() => {
    Object.defineProperty(global.Element.prototype, 'innerText', {
      get() {
        return this.textContent;
      },
    });
  });

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
        'OSIDB responded with error 500 (Internal Server Error). \nInternal Server Error',
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
        'OSIDB responded with error 500 (Internal Server Error). \nerror: Internal Server Error',
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

  it('should parse errors from HTML responses', () => {
    const error = {
      response: {
        headers: {
          'content-type': 'text/html',
        },
        data: '<div class="exception_value">Some error on line 1</div>',
      },
    };
    expect(getDisplayedOsidbError(error)).toBe('OSIDB reported an error: Some error on line 1');
  });

  it('should return default error when HTML does not match', () => {
    const error = {
      response: {
        headers: {
          'content-type': 'text/html',
        },
        data: '<h1>Server Error (500)</h1><p></p>',
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8000/api/v1/errors',
      },
    };

    expect(getDisplayedOsidbError(error))
      .toBe('OSIDB responded with error 500 (Internal Server Error) for request http://localhost:8000/api/v1/errors).');
  });

  describe('parseOsidbErrors', () => {
    it('should return a string with each error message separated by a pair of newlines', () => {
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
        + 'Internal Server Error',
      );
    });
  });
});
