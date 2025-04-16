import { http, HttpResponse } from 'msw';

import type { CWEMemberType } from '@/types/mitreCwe';
import { osimRuntime } from '@/stores/osimRuntime';
import { server } from '@/__tests__/setup';

import { DATA_KEY, loadCweData, updateCWEData } from '../CweService';

describe('cweService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadCweData', () => {
    it('should load stored state', () => {
      const cwe: CWEMemberType = {
        id: '123',
        name: 'test',
        status: 'Draft',
        summary: 'for testing',
        usage: 'approved',
      };
      localStorage.setItem(DATA_KEY, JSON.stringify([cwe]));

      const data = loadCweData();

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toEqual(1);
      expect(data[0]).toEqual(cwe);
    });

    it('should handle empty state', () => {
      const data = loadCweData();

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toEqual(0);
    });
  });

  describe('updateCWEData', () => {
    const baseUrl = 'http://testing.test';
    const mockedVersion = '1337';

    beforeAll(() => {
      server.use(
        http.get(`${baseUrl}/cwe/version`, () => HttpResponse.json({
          ContentVersion: mockedVersion,
        })),
        http.get(`${baseUrl}/cwe/view/699`, () => HttpResponse.json({
          Views: [
            {
              Members: [
                {
                  CweID: '123',
                },
              ],
            },
          ],
        })),
        http.get(`${baseUrl}/cwe/category/:id`, () => HttpResponse.json({
          Categories: [{
            Relationships: [{
              CweID: '123',
            }],
          }],
        })),
        http.get(`${baseUrl}/cwe/weakness/:id`, () => HttpResponse.json({
          Weaknesses: [],
        })),
      );
    });

    beforeEach(() => {
      // @ts-expect-error osimRuntime is a readOnly global ref in runtime, but mocked during testing
      osimRuntime.value.backends.mitre = baseUrl;
      vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return early if "baseUrl" is not set', async () => {
      // @ts-expect-error same as above
      osimRuntime.value.backends.mitre = '';
      vi.spyOn(console, 'debug');
      vi.spyOn(Storage.prototype, 'setItem');
      vi.spyOn(global, 'fetch');

      await updateCWEData();

      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch data if uptodate', async () => {
      const mockedVersion = '1337';
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => mockedVersion);
      vi.spyOn(Storage.prototype, 'setItem');

      await updateCWEData();

      expect(localStorage.getItem).toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
