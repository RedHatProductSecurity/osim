import { watchEffect, nextTick } from 'vue';

import type { ZodAffectType } from '@/types';

import { blankFlaw, useFlaw } from '../useFlaw';

describe('useFlaw', () => {
  beforeEach(() => {
    const { resetFlaw } = useFlaw();

    resetFlaw();
  });
  it('does not invalidate the dirty check when excluded collections change', async () => {
    const { flaw, isFlawUpdated, setFlaw, setLateFlawField } = useFlaw();
    setFlaw(blankFlaw());
    expect(isFlawUpdated.value).toBe(false);
    let evaluations = 0;
    const stop = watchEffect(() => {
      void isFlawUpdated.value;
      evaluations++;
    });

    const affects = Array.from({ length: 500 }, (_, i) => ({ uuid: String(i) })) as ZodAffectType[];
    setLateFlawField('affects', affects);
    flaw.value.affects = [{ uuid: 'different' } as ZodAffectType];
    flaw.value.trackers = [];
    flaw.value.cvss_scores = [];
    await nextTick();
    expect(evaluations).toBe(1);
    expect(isFlawUpdated.value).toBe(false);

    flaw.value.title = 'Changed';
    await nextTick();
    expect(evaluations).toBe(2);
    expect(isFlawUpdated.value).toBe(true);
    stop();
  });

  it('should replace the flaw', () => {
    const { flaw, setFlaw } = useFlaw();
    const newFlaw = {
      ...blankFlaw(),
      title: 'test-001',
    };
    setFlaw(newFlaw);

    expect(flaw.value).toEqual(newFlaw);
  });

  it('should replace a specific key', () => {
    const { flaw, setFlaw } = useFlaw();
    const affects = [{ uuid: '1' }, { uuid: '2' }] as ZodAffectType[];

    setFlaw(affects, 'affects');

    expect(flaw.value.title).toEqual('');
    expect(flaw.value.affects).toEqual(affects);
  });

  it('should merge a specific key', () => {
    const { flaw, setFlaw } = useFlaw();
    flaw.value.affects = [{ uuid: '1' } as ZodAffectType];
    const affects = [{ uuid: '1' }, { uuid: '2' }] as ZodAffectType[];

    setFlaw(affects, 'affects', false);

    expect(flaw.value.title).toEqual('');
    expect(flaw.value.affects).toEqual(affects);
  });
});
