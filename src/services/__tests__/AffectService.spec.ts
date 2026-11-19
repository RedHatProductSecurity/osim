import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getAffects } from '@/services/AffectService';
import { osidbFetch } from '@/services/OsidbAuthService';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
vi.mock('@/services/OsidbAuthService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/OsidbAuthService')>();
  return {
    ...actual,
    osidbFetch: vi.fn(),
  };
});

vi.mock('@/utils/helpers', () => ({
  isCveValid: (s: string) => /^CVE-\d{4}-\d{4,}$/.test(s),
}));

const mockedFetch = vi.mocked(osidbFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type FakeAffect = {
  idx: number;
  ps_component: string;
  ps_module: string;
  uuid: string;
};

function makeAffects(total: number): FakeAffect[] {
  return Array.from({ length: total }, (_, i) => ({
    uuid: `affect-${String(i).padStart(5, '0')}`,
    idx: i,
    ps_module: 'rhel-9',
    ps_component: `comp-${i % 10}`,
  }));
}

type FetchCall = { fieldValue?: string; limit?: number; offset?: number };

/**
 * Install a mock that simulates paginated OSIDB `/affects` with artificial
 * per-request latency. Tracks concurrency and call order for assertions.
 */
function installPaginatedMock(
  allAffects: FakeAffect[],
  opts: {
    /** Per-offset extra latency to force out-of-order completions (offset -> ms) */
    latencyByOffset?: Map<number, number>;
    latencyMs?: number;
    /** If true, `count` is omitted to force the cursor fallback path */
    omitCount?: boolean;
    /** Cursor fallback: map `next` URL -> page index; when set, firstResponse.next is populated */
    withNextCursor?: boolean;
  } = {},
) {
  const latencyMs = opts.latencyMs ?? 20;
  let concurrent = 0;
  let maxConcurrent = 0;
  const calls: FetchCall[] = [];
  const callTimestamps: number[] = [];

  const mockImpl = vi.fn(async (config: any) => {
    concurrent++;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    let params = config.params ?? {};
    if (config.url?.includes('?')) {
      const qs = new URL(config.url, 'http://localhost').searchParams;
      if (qs.has('limit')) params = { ...params, limit: Number(qs.get('limit')) };
      if (qs.has('offset')) params = { ...params, offset: Number(qs.get('offset')) };
    }
    const limit: number = params.limit ?? 100;
    const offset: number = params.offset ?? 0;
    const fieldValue = params.flaw__uuid ?? params.cve_id ?? 'unknown';
    calls.push({ limit, offset, fieldValue });
    callTimestamps.push(performance.now());

    // Latency simulation — respects AbortSignal
    const extra = opts.latencyByOffset?.get(offset) ?? 0;
    const delay = latencyMs + extra;
    if (config.signal) {
      if (config.signal.aborted) {
        concurrent--;
        const err = new DOMException('Aborted', 'AbortError');
        return Promise.reject(err);
      }
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delay);
        const onAbort = () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        config.signal!.addEventListener('abort', onAbort, { once: true });
        // Clean up listener on normal completion via timeout wrapper
        setTimeout(
          () => config.signal!.removeEventListener('abort', onAbort),
          delay + 5,
        );
      }).catch((e) => {
        concurrent--;
        throw e;
      });
      if (config.signal.aborted) {
        concurrent--;
        throw new DOMException('Aborted', 'AbortError');
      }
    } else {
      await new Promise(r => setTimeout(r, delay));
    }

    const results = allAffects.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const hasMore = nextOffset < allAffects.length;

    concurrent--;

    // Build response shape matching real OSIDB PaginatedAffectList
    const data: any = {
      results,
      // When testing cursor fallback, provide opaque next URL; otherwise omit
      next:
        opts.withNextCursor && hasMore
          ? `/osidb/api/v2/affects?limit=${limit}&offset=${nextOffset}`
          : opts.withNextCursor
            ? null
            : null,
      // In offset mode `next` is not used, but keep null for clarity
      previous:
        offset > 0
          ? `/osidb/api/v2/affects?limit=${limit}&offset=${Math.max(0, offset - limit)}`
          : null,
    };
    if (!opts.omitCount) data.count = allAffects.length;
    // When cursor mode, synthesize next as relative URL for fallback path
    if (opts.withNextCursor) {
      data.next = hasMore
        ? `/osidb/api/v2/affects?limit=${limit}&offset=${nextOffset}`
        : null;
    } else {
      // Offset mode still returns next as absolute URL to exercise fallback if count missing
      data.next = hasMore
        ? `http://localhost:3000/osidb/api/v2/affects?limit=${limit}&offset=${nextOffset}`
        : null;
    }

    return { data, response: new Response(null, { status: 200 }) };
  });

  mockedFetch.mockImplementation(mockImpl as any);

  return {
    get concurrent() {
      return concurrent;
    },
    get maxConcurrent() {
      return maxConcurrent;
    },
    get calls() {
      return calls;
    },
    get callTimestamps() {
      return callTimestamps;
    },
    mockImpl,
  };
}

/**
 * Reference serial implementation — mirrors the old `AffectService.ts:36-51`
 * cursor-chasing `while(nextUrl)` with sequential awaits. Used to baseline
 * wall-clock time against the new bounded-concurrency implementation.
 */
async function getAffectsSerial(
  cveOrUuid: string,
  allAffects: FakeAffect[],
  pageSize = 100,
  latencyMs = 20,
): Promise<{ calls: number; durationMs: number; results: FakeAffect[] }> {
  const t0 = performance.now();
  // Simulate first fetch + serial cursor loop
  const total = allAffects.length;
  const pages = Math.ceil(total / pageSize);
  const results: FakeAffect[] = [];
  let calls = 0;
  for (let page = 0; page < pages; page++) {
    const offset = page * pageSize;
    // Each page pays full RTT sequentially
    await new Promise(r => setTimeout(r, latencyMs));
    calls++;
    const slice = allAffects.slice(offset, offset + pageSize);
    results.push(...slice);
  }
  const durationMs = performance.now() - t0;
  void cveOrUuid; // keep signature parity
  return { results, durationMs, calls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('affectService.getAffects — correctness', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('single page: returns all affects without extra fetches', async () => {
    const affects = makeAffects(42);
    installPaginatedMock(affects, { latencyMs: 5 });
    const { data } = await getAffects('flaw-uuid-1');
    expect(data.results).toHaveLength(42);
    expect(data.results[0].uuid).toBe('affect-00000');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(data.next).toBeNull();
  });

  it('zero affects: handles count=0', async () => {
    installPaginatedMock([], { latencyMs: 5 });
    const { data } = await getAffects('flaw-uuid-1');
    expect(data.results).toHaveLength(0);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('exact page boundary: count=200, pageSize=100 => 2 pages', async () => {
    installPaginatedMock(makeAffects(200), { latencyMs: 5 });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
    });
    expect(data.results).toHaveLength(200);
    // first + 1 offset
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    const offsets = mockedFetch.mock.calls.map((c: any) => c[0].params?.offset);
    expect(offsets).toEqual([undefined, 100]);
    // Verify order preserved
    expect(data.results.map((r: any) => r.idx)).toEqual(
      Array.from({ length: 200 }, (_, i) => i),
    );
  });

  it('offset math: count=250, pageSize=100 => offsets [100,200]', async () => {
    installPaginatedMock(makeAffects(250), { latencyMs: 5 });
    await getAffects('flaw-uuid-1', undefined, { pageSize: 100 });
    expect(mockedFetch).toHaveBeenCalledTimes(3); // first + 2 offsets
    const offsets = mockedFetch.mock.calls
      .slice(1)
      .map((c: any) => c[0].params.offset);
    expect(offsets).toEqual([100, 200]);
  });

  it('preserves order despite out-of-order completion', async () => {
    const affects = makeAffects(300);
    // Make offset 200 resolve faster than offset 100
    installPaginatedMock(affects, {
      latencyMs: 10,
      latencyByOffset: new Map([
        [100, 30],
        [200, 0],
      ]),
    });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
    });
    expect(data.results).toHaveLength(300);
    expect(data.results.map((r: any) => r.idx)).toEqual(
      Array.from({ length: 300 }, (_, i) => i),
    );
  });

  it('calls onFetchedCallback with cumulative counts', async () => {
    installPaginatedMock(makeAffects(250), { latencyMs: 5 });
    const cb = vi.fn();
    await getAffects('flaw-uuid-1', cb, { pageSize: 100, concurrency: 5 });
    // Called for first page + after merge (2 batches merged together emit per batch in current impl)
    expect(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(250); // fetched
    expect(lastCall[1]).toBe(250); // total
  });

  it('uses correct field for CVE vs UUID', async () => {
    installPaginatedMock(makeAffects(10), { latencyMs: 5 });
    await getAffects('CVE-2024-12345');
    expect((mockedFetch.mock.calls[0]![0] as any).params.cve_id).toBe('CVE-2024-12345');
    expect((mockedFetch.mock.calls[0]![0] as any).params.flaw__uuid).toBeUndefined();

    vi.clearAllMocks();
    installPaginatedMock(makeAffects(10), { latencyMs: 5 });
    await getAffects('550e8400-e29b-41d4-a716-446655440000');
    expect((mockedFetch.mock.calls[0]![0] as any).params.flaw__uuid).toBeDefined();
  });

  it('fallback path when count is missing: cursor-chasing works', async () => {
    // Simulate server without count -> fallback sequential cursor path
    installPaginatedMock(makeAffects(250), {
      latencyMs: 5,
      omitCount: true,
      withNextCursor: true,
    });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
    });
    // Fallback follows next URLs sequentially until null
    expect(data.results).toHaveLength(250);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('abort signal aborts pending fetches', async () => {
    installPaginatedMock(makeAffects(500), { latencyMs: 30 });
    const controller = new AbortController();
    const promise = getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
      signal: controller.signal,
    });
    // Abort after first page resolves but before parallel batch completes
    setTimeout(() => controller.abort(), 25);
    await expect(promise).rejects.toThrow(/Abort/i);
  });

  it('sets next to null in returned data (fixes stale return)', async () => {
    installPaginatedMock(makeAffects(150), { latencyMs: 5 });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
    });
    expect(data.next).toBeNull();
  });

  it('handles 10,000 affects: offset math, order, and correctness', async () => {
    const total = 10_000;
    const pageSize = 100; // 100 pages => 1 first + 99 offsets
    const affects = makeAffects(total);
    // Low latency keeps test <2s even with 100 mocked fetches
    installPaginatedMock(affects, { latencyMs: 3 });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize,
      concurrency: 5,
    });
    expect(data.results).toHaveLength(total);
    expect(data.next).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(100);
    // First call has no offset; remaining 99 are [100,200,...,9900]
    const offsets = mockedFetch.mock.calls
      .slice(1)
      .map((c: any) => c[0].params.offset);
    expect(offsets).toEqual(
      Array.from({ length: 99 }, (_, i) => (i + 1) * 100),
    );
    // Spot-check order is preserved end-to-end (pMap preserves input order)
    expect((data.results[0] as unknown as FakeAffect).idx).toBe(0);
    expect((data.results[9999] as unknown as FakeAffect).idx).toBe(9999);
    expect(data.results.map((r: any) => r.idx)).toEqual(
      Array.from({ length: total }, (_, i) => i),
    );
  }, 15000);

  it('handles 10,000 affects with varying pageSize (1000)', async () => {
    const total = 10_000;
    const pageSize = 1000; // 10 pages => 1 first + 9 offsets
    const affects = makeAffects(total);
    installPaginatedMock(affects, { latencyMs: 3 });
    const { data } = await getAffects('flaw-uuid-1', undefined, {
      pageSize,
      concurrency: 5,
    });
    expect(data.results).toHaveLength(total);
    expect(mockedFetch).toHaveBeenCalledTimes(10);
    const offsets = mockedFetch.mock.calls
      .slice(1)
      .map((c: any) => c[0].params.offset);
    expect(offsets).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
    ]);
  }, 10000);
});

describe('affectService.getAffects — concurrency', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('caps concurrency to requested limit (c=5) for 10 pages', async () => {
    const tracker = installPaginatedMock(makeAffects(1000), { latencyMs: 15 });
    await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
    });
    expect(tracker.maxConcurrent).toBeLessThanOrEqual(5);
    // 1000/100 = 10 pages => 1 first + 9 offsets, 9 concurrent slots limited to 5
    expect(mockedFetch).toHaveBeenCalledTimes(10);
  });

  it('concurrency=1 behaves serially (maxConcurrent == 1)', async () => {
    const tracker = installPaginatedMock(makeAffects(500), { latencyMs: 10 });
    await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 1,
    });
    expect(tracker.maxConcurrent).toBe(1);
  });

  it('concurrency=3 caps at 3 even with 50 pages', async () => {
    const tracker = installPaginatedMock(makeAffects(5000), { latencyMs: 8 });
    await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 3,
    });
    expect(tracker.maxConcurrent).toBeLessThanOrEqual(3);
    expect(mockedFetch).toHaveBeenCalledTimes(50);
  });

  it('higher concurrency does not change result correctness', async () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping -- test-local helper needs per-call mock
    const make = (c: number) => {
      installPaginatedMock(makeAffects(600), { latencyMs: 5 });
      return getAffects('flaw-uuid-1', undefined, {
        pageSize: 100,
        concurrency: c,
      });
    };
    const [r3, r5] = await Promise.all([make(3), make(5)]);
    expect(r3.data.results).toHaveLength(600);
    expect(r5.data.results).toHaveLength(600);
    expect(r3.data.results.map((x: any) => x.uuid)).toEqual(
      r5.data.results.map((x: any) => x.uuid),
    );
  });

  it('10,000 affects: caps concurrency at 5 (100 pages, 99 offsets)', async () => {
    const tracker = installPaginatedMock(makeAffects(10_000), { latencyMs: 4 });
    await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
    });
    expect(tracker.maxConcurrent).toBeLessThanOrEqual(5);
    expect(tracker.maxConcurrent).toBe(5); // enough work to saturate pool
    expect(mockedFetch).toHaveBeenCalledTimes(100);
  }, 15000);
});

describe('affectService.getAffects — performance regression', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  /**
   * Synthetic wall-clock comparison: serial (old) vs parallel (new).
   * Uses the in-test serial reference vs the real getAffects with mocked latency.
   * Latency 25ms per request models ~75ms RTT compressed for test speed.
   * Thresholds mirror proposals.md §2.5: p95 TTC_parallel ≈ 0.35× TTC_serial for N≥5.
   */
  const cases: Array<{
    concurrency: number;
    maxRatio: number;
    pageSize: number;
    total: number;
  }> = [
    { total: 100, pageSize: 100, concurrency: 5, maxRatio: 1.1 }, // 1 page: no improvement expected
    { total: 250, pageSize: 100, concurrency: 5, maxRatio: 0.7 }, // 3 pages: ~2 RTT vs 3 RTT
    { total: 500, pageSize: 100, concurrency: 5, maxRatio: 0.5 }, // 5 pages: 2 RTT vs 5 RTT
    { total: 1000, pageSize: 100, concurrency: 5, maxRatio: 0.4 }, // 10 pages: 3 RTT vs 10 RTT
    { total: 10000, pageSize: 100, concurrency: 5, maxRatio: 0.3 }, // 100 pages: ~21 RTT vs 100 RTT => -80%
  ];

  it.each(cases)(
    'total=$total pageSize=$pageSize c=$concurrency serial vs parallel ratio < $maxRatio',
    async ({ concurrency, maxRatio, pageSize, total }) => {
      // Use shorter latency for 10k to keep test time reasonable (100*3ms vs 100*25ms)
      const latencyMs = total >= 10000 ? 3 : 25;
      const affects = makeAffects(total);

      // Baseline: serial reference
      const { durationMs: serialMs } = await getAffectsSerial(
        'flaw-uuid-1',
        affects,
        pageSize,
        latencyMs,
      );

      // Candidate: real getAffects with mocked latency
      installPaginatedMock(affects, { latencyMs });
      const t0 = performance.now();
      const { data } = await getAffects('flaw-uuid-1', undefined, {
        pageSize,
        concurrency,
      });
      const parallelMs = performance.now() - t0;

      expect(data.results).toHaveLength(total);

      const ratio = parallelMs / serialMs;
      // Log for human inspection in CI; not asserted as flake-prone strict, but guarded by maxRatio

      console.log(
        // eslint-disable-next-line max-len
        `[perf] total=${total} pageSize=${pageSize} c=${concurrency} serial=${serialMs.toFixed(1)}ms parallel=${parallelMs.toFixed(1)}ms ratio=${ratio.toFixed(3)} (budget ${maxRatio})`,
      );

      // Single-page case: parallel should not be slower than serial by >10%
      // Multi-page: must be faster than budget
      expect(ratio).toBeLessThan(maxRatio);
    },
    20000,
  );

  it('prints summary table for docs/bench (informational, always passes)', async () => {
    const latencyMs = 25;
    const rows: Array<{
      parallelMs: number;
      ratio: number;
      savedMs: number;
      serialMs: number;
      total: number;
    }> = [];
    for (const total of [100, 250, 500, 1000, 2000, 10000]) {
      const affects = makeAffects(total);
      const { durationMs: serialMs } = await getAffectsSerial(
        'flaw-uuid-1',
        affects,
        100,
        latencyMs,
      );
      installPaginatedMock(affects, { latencyMs });
      const t0 = performance.now();
      await getAffects('flaw-uuid-1', undefined, {
        pageSize: 100,
        concurrency: 5,
      });
      const parallelMs = performance.now() - t0;
      rows.push({
        total,
        serialMs,
        parallelMs,
        ratio: parallelMs / serialMs,
        savedMs: serialMs - parallelMs,
      });
      vi.clearAllMocks();
    }

    console.table(
      rows.map(r => ({
        total: r.total,
        pages: Math.ceil(r.total / 100),
        serialMs: r.serialMs.toFixed(1),
        parallelMs: r.parallelMs.toFixed(1),
        ratio: r.ratio.toFixed(3),
        savedMs: r.savedMs.toFixed(1),
        improvement: `${((1 - r.ratio) * 100).toFixed(1)}%`,
      })),
    );
    // Sanity: parallel never slower than serial by >15% even in worst case
    for (const r of rows) expect(r.ratio).toBeLessThan(1.15);
  });

  it('fails if concurrency is not respected (regression guard)', async () => {
    // This test documents the old behavior: unbounded Promise.all would spike to N
    // concurrent requests. New code must cap. Simulate 20 pages with c=5 => max 5.
    const tracker = installPaginatedMock(makeAffects(2000), { latencyMs: 12 });
    await getAffects('flaw-uuid-1', undefined, {
      pageSize: 100,
      concurrency: 5,
    });
    expect(tracker.maxConcurrent).toBe(5);
    // If implementation regressed to Promise.all without cap, maxConcurrent would be 19
    expect(tracker.maxConcurrent).not.toBe(19);
  });
});
