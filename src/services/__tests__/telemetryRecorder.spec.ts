import { describe, expect, it, vi } from 'vitest';

import { recordVueError, registerTelemetryRecorders } from '../telemetryRecorder';

describe('telemetryRecorder', () => {
  it('replays later errors when an earlier recorder throws', () => {
    recordVueError('first');
    recordVueError('second');
    const seen: unknown[] = [];
    registerTelemetryRecorders(vi.fn(), (error) => {
      seen.push(error);
      if (error === 'first') throw new Error('recording failed');
    });
    expect(seen).toEqual(['first', 'second']);
  });
});
