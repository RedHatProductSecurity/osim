import { ref, computed } from 'vue';

import { deepCopyFromRaw, unwrap, mergeBy } from '../helpers';

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

describe('mergeBy', () => {
  it('should merge arrays by specified key, with right overriding left', () => {
    const left = [
      { id: 1, name: 'Alice', age: 25 },
      { id: 2, name: 'Bob', age: 30 },
    ];
    const right = [
      { id: 1, name: 'Alice Updated', age: 26 },
      { id: 3, name: 'Charlie', age: 35 },
    ];

    const result = mergeBy(left, right, 'id');

    expect(result).toEqual([
      { id: 1, name: 'Alice Updated', age: 26 }, // Updated from right
      { id: 2, name: 'Bob', age: 30 }, // Kept from left
      { id: 3, name: 'Charlie', age: 35 }, // Added from right
    ]);
  });

  it('should preserve order of left array and append new elements from right', () => {
    const left = [
      { key: 'c', value: 3 },
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ];
    const right = [
      { key: 'a', value: 10 }, // Override
      { key: 'd', value: 4 }, // New
    ];

    const result = mergeBy(left, right, 'key');

    expect(result).toEqual([
      { key: 'c', value: 3 },
      { key: 'a', value: 10 }, // Updated, but in original position
      { key: 'b', value: 2 },
      { key: 'd', value: 4 }, // Appended
    ]);
  });

  it('should handle empty arrays', () => {
    const left: { id: number }[] = [];
    const right = [{ id: 1 }];

    expect(mergeBy(left, right, 'id')).toEqual([{ id: 1 }]);
    expect(mergeBy([{ id: 1 }], [], 'id')).toEqual([{ id: 1 }]);
    expect(mergeBy([], [], 'id')).toEqual([]);
  });

  it('should handle duplicate keys in right array (last wins)', () => {
    const left = [{ id: 1, value: 'original' }];
    const right = [
      { id: 1, value: 'first' },
      { id: 1, value: 'second' },
      { id: 2, value: 'new' },
    ];

    const result = mergeBy(left, right, 'id');

    expect(result).toEqual([
      { id: 1, value: 'second' }, // Last duplicate from right wins
      { id: 2, value: 'new' },
    ]);
  });

  it('should handle undefined and null key values', () => {
    const left = [
      { id: null, name: 'null-id' },
      { id: undefined, name: 'undefined-id' },
      { id: 1, name: 'valid' },
    ];
    const right = [
      { id: null, name: 'updated-null' },
      { id: 2, name: 'new-valid' },
    ];

    const result = mergeBy(left, right, 'id');

    expect(result).toEqual([
      { id: null, name: 'updated-null' },
      { id: undefined, name: 'undefined-id' },
      { id: 1, name: 'valid' },
      { id: 2, name: 'new-valid' },
    ]);
  });
});
