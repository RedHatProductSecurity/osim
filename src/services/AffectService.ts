import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import { isCveValid } from '@/utils/helpers';
import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/';

export async function getAffect(uuid: string): Promise<ZodAffectType> {
  const { data } = await osidbFetch({ method: 'get', url: `/osidb/api/v2/affects/${uuid}`, cache: 'no-cache' });
  return data as ZodAffectType;
}

type AffectFetchCallback = (fetchedCount: number, totalCount: number) => void;

export type AffectFetchOptions = {
  concurrency?: number;
  pageSize?: number;
  // optional AbortSignal to cancel in-flight fetches (e.g. on route leave); forwarded to osidbFetch/fetch
  signal?: AbortSignal;
};

// Bounded-concurrency mapper without extra deps
async function pMap<T, R>(
  items: T[],
  // mapper: async transform for each item; receives item + original index (e.g. offset => fetch page)
  mapper: (item: T, index: number) => Promise<R>,
  { concurrency = 5 }: { concurrency?: number } = {},
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      // claim next slot atomically; idx preserves input order despite parallel workers
      const idx = nextIndex++;
      results[idx] = await mapper(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function getAffects(
  cveOrUuid: string,
  onFetchedCallback?: AffectFetchCallback,
  opts: AffectFetchOptions = {},
): Promise<{ data: { count?: number; next?: null | string; results: ZodAffectType[] }; response: Response }> {
  const field = isCveValid(cveOrUuid) ? 'cve_id' : 'flaw__uuid';
  const pageSize = opts.pageSize ?? 100;
  const concurrency = opts.concurrency ?? 5;
  const signal = opts.signal;

  // First request to get up to `pageSize` affects and the total count
  const firstResponse = await osidbFetch({
    method: 'get',
    url: '/osidb/api/v2/affects',
    params: {
      [field]: cveOrUuid,
      limit: pageSize,
    },
    signal,
  });

  const allAffects: ZodAffectType[] = [...firstResponse.data.results];
  const totalCount: number = firstResponse.data.count;

  if (onFetchedCallback) {
    try {
      onFetchedCallback(allAffects.length, totalCount);
    } catch { void 0; }
  }

  // Offset math is straightforward once count is known from the first response.
  // If count is finite, fan out remaining offsets in parallel with bounded concurrency.
  if (Number.isFinite(totalCount)) {
    const pages = Math.ceil(totalCount / pageSize);
    if (pages > 1) {
      const offsets = Array.from(
        { length: pages - 1 },
        (_, i) => (i + 1) * pageSize,
      );
      const pagesData = await pMap(
        offsets,
        async (offset) => {
          signal?.throwIfAborted();
          const response = await osidbFetch({
            method: 'get',
            url: '/osidb/api/v2/affects',
            params: {
              [field]: cveOrUuid,
              limit: pageSize,
              offset,
            },
            signal,
          });
          return response;
        },
        { concurrency },
      );

      // Merge in offset order (pMap preserves input order) and emit progress
      for (const page of pagesData) {
        for (const affect of page.data.results) {
          allAffects.push(affect);
        }
        if (onFetchedCallback) {
          try {
            onFetchedCallback(allAffects.length, totalCount);
          } catch { void 0; }
        }
      }

      return {
        data: {
          ...firstResponse.data,
          results: allAffects,
          next: null,
        },
        response: firstResponse.response,
      };
    }
  }

  // Fallback: cursor-chasing sequential path when count is unknown (keeps compatibility
  // if server ever migrates to cursor-only). Mirrors original behavior with fixes.
  let nextUrl: null | string = firstResponse.data.next;
  const seen = new Set<string>();
  let pagesFetched = 0;
  const MAX_PAGES = 100;

  while (nextUrl !== null) {
    signal?.throwIfAborted();
    if (seen.has(nextUrl)) break;
    if (++pagesFetched > MAX_PAGES) break;
    seen.add(nextUrl);

    // Handle absolute or relative next URL
    const relativePath = nextUrl.startsWith('http')
      ? (() => {
          const url = new URL(nextUrl, window.location.origin);
          return url.pathname + url.search;
        })()
      : nextUrl;

    const response = await osidbFetch({
      method: 'get',
      url: relativePath,
      signal,
    });

    for (const affect of response.data.results) allAffects.push(affect);
    nextUrl = response.data.next;

    if (onFetchedCallback) {
      try {
        onFetchedCallback(allAffects.length, totalCount);
      } catch { void 0; }
    }

    if (response.data.results.length === 0) {
      break;
    }
  }

  return {
    data: {
      ...firstResponse.data,
      results: allAffects,
      next: null,
    },
    response: firstResponse.response,
  };
}

export async function putAffect(uuid: string, affectObject: any) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/affects/${uuid}`,
    data: affectObject,
  });
}

export async function putAffectWithHandlers(uuid: string, affectObject: any) {
  return putAffect(uuid, affectObject)
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Updated.' }))
    .catch(createCatchHandler('Error updating Affect:'));
}

export async function putAffects(affectObjects: any[]) {
  return osidbFetch({
    method: 'put',
    url: '/osidb/api/v2/affects/bulk',
    data: affectObjects,
  })
    .catch(createCatchHandler('Error updating Affects:'));
}

type AffectPost = Omit<ZodAffectType, 'alerts' | 'cvss_scores' | 'trackers'>;
export async function postAffects(affectObjects: AffectPost[]) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v2/affects/bulk',
    data: affectObjects,
  })
    .catch(createCatchHandler('Error creating Affects:'));
}

export async function deleteAffects(affectUuids: string[]) {
  if (affectUuids.length === 0) {
    return;
  }
  return osidbFetch({
    method: 'delete',
    url: '/osidb/api/v2/affects/bulk',
    data: affectUuids,
  })
    .catch(createCatchHandler('Error deleting Affect:'));
}

// {
// "comment": "string",
// "cvss_version": "V2",
// "issuer": "RH",
// "vector": "string",
// "embargoed": true
//   "updated_dt": "2024-02-06T16:02:54.708Z"
// }
export async function putAffectCvssScore(
  affectId: string,
  cvssScoresId: string,
  cvssScoreObject: ZodAffectCVSSType,
) {
  const putObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  delete putObject['uuid'];
  delete putObject['affect'];
  delete putObject['created_dt'];

  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores/${cvssScoresId}`,
    data: putObject,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem updating affect CVSS scores:'));
}

// {
// "comment": "string",
// "cvss_version": "V2",
// "issuer": "RH",
// "vector": "string",
// "embargoed": true
// }
export async function postAffectCvssScore(affectId: string, cvssScoreObject: ZodAffectCVSSType) {
  const postObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores`,
    data: postObject,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem updating affect CVSS scores:'));
}

export async function deleteAffectCvssScore(affectId: string, cvssScoresId: string) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores/${cvssScoresId}`,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem deleting affect CVSS scores:'));
}
