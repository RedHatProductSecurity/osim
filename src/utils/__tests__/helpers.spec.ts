import { ref, computed } from 'vue';

import { deepCopyFromRaw, unwrap } from '../helpers';

describe('the unwrap function', () => {
  it('should unwrap refs', () => {
    const refValue: any = ref('test');
    const unwrappedRef = unwrap(refValue);
    expect(unwrappedRef).toBe('test');
    refValue.value = ref('test');
    expect(unwrappedRef).toBe('test');
    refValue.value.value = ref(ref(ref(computed(() => 'test'))));
    expect(unwrappedRef).toBe('test');
    // expect(unwrappedReactive).toEqual({ prop: 'test' });
    // expect(unwrappedProxy).toEqual({ prop: 'test' });
  });
});

describe('the deepCopyFromRaw function', () => {
  it('make deep copies of arrays of refs', () => {
    const testArray = [ref('test1'), ref(ref('test2'))];
    const hopefullyADeepCopy = deepCopyFromRaw(testArray);
    expect(hopefullyADeepCopy).not.toBe(testArray);
    testArray[0].value = 'test3';
    expect(hopefullyADeepCopy).toStrictEqual(['test1', 'test2']);
    expect(hopefullyADeepCopy[0]).not.toBe(testArray[0]);
    expect(hopefullyADeepCopy[0]).not.toBe(testArray[0].value);

    // expect(unwrappedReactive).toEqual({ prop: 'test' });
    // expect(unwrappedProxy).toEqual({ prop: 'test' });
  });

  it('make deep copies complex objects', () => {
    const testObject = ref({
      isPotato: true,
      potatoFacts: [
        { isTasty: [true, false] },
        { isPotato: true },
        { isNotPotato: false },
      ],
      children: [
        ref('test1'),
        ref({ property: 'test2' }),
      ],
    });
    const hopefullyADeepCopy = deepCopyFromRaw(testObject);
    expect(hopefullyADeepCopy).not.toBe(testObject);
    expect(hopefullyADeepCopy).toStrictEqual({
      isPotato: true,
      potatoFacts: [
        { isTasty: [true, false] },
        { isPotato: true },
        { isNotPotato: false },
      ],
      children: [
        'test1',
        { property: 'test2' },
      ],
    });
  });
});
