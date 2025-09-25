import type { ZodAffectType } from '@/types';

import { blankFlaw, useFlaw } from '../useFlaw';

describe('useFlaw', () => {
  beforeEach(() => {
    const { resetFlaw } = useFlaw();

    resetFlaw();
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
