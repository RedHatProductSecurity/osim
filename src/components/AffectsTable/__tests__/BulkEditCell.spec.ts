import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { Column } from '@tanstack/vue-table';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { IssuerEnum } from '@/generated-client';

import BulkEditCell from '../BulkEditCell.vue';

const createMockColumn = (meta?: any): Column<ZodAffectType, unknown> => ({
  id: 'test_column',
  columnDef: { meta },
  getSize: () => 100,
} as Column<ZodAffectType, unknown>);

const createMockVirtualRow = (original: Partial<ZodAffectType> = {}) => ({
  original,
});

describe('bulkEditCell', () => {
  describe('editable fields', () => {
    it('should render text input for editable field without enum', async () => {
      const column = createMockColumn({ bulkEditable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      const input = wrapper.find('input.form-control');
      expect(input.exists()).toBe(true);
      expect(input.attributes('type')).toBe('text');
      expect(input.attributes('placeholder')).toBe('—');
    });

    it('should render select dropdown for editable field with enum', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        enum: { value1: 'Value 1', value2: 'Value 2' },
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      const select = wrapper.find('select.form-select');
      expect(select.exists()).toBe(true);

      const options = wrapper.findAll('option');
      expect(options.length).toBe(3); // empty option + 2 enum values
      expect(options[0].text()).toBe('—');
      expect(options[1].text()).toBe('Value 1');
      expect(options[2].text()).toBe('Value 2');
    });

    it('should evaluate enum function with virtual row', async () => {
      const enumFn = vi.fn((row: any) => {
        return row?.original.affectedness === 'NOTAFFECTED'
          ? { justified: 'Justified' }
          : {};
      });

      const column = createMockColumn({
        bulkEditable: true,
        enum: enumFn,
      });

      const virtualRow = createMockVirtualRow({ affectedness: 'NOTAFFECTED' });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow,
        },
      });

      expect(enumFn).toHaveBeenCalledWith(virtualRow);
      const options = wrapper.findAll('option');
      expect(options.length).toBe(2); // empty option + 1 conditional value
      expect(options[1].text()).toBe('Justified');
    });

    it('should render CVSS calculator for cvss field', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        cvss: true,
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: [],
          virtualRow: createMockVirtualRow(),
        },
      });

      // Initially shows score
      expect(wrapper.text()).toContain('0');

      // Click to open calculator - find the div with form-control class that contains the score
      const scoreDiv = wrapper.find('div.form-control');
      expect(scoreDiv.exists()).toBe(true);
      await scoreDiv.trigger('click');

      const calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
      expect(calculator.exists()).toBe(true);
    });
  });

  describe('non-editable fields', () => {
    it('should render placeholder for non-editable field', async () => {
      const column = createMockColumn({ bulkEditable: false });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      expect(wrapper.find('span.text-muted').exists()).toBe(true);
      expect(wrapper.text()).toBe('—');
      expect(wrapper.find('input').exists()).toBe(false);
      expect(wrapper.find('select').exists()).toBe(false);
    });

    it('should render placeholder when bulkEditable is undefined', async () => {
      const column = createMockColumn({});
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      expect(wrapper.find('span.text-muted').exists()).toBe(true);
      expect(wrapper.text()).toBe('—');
    });
  });

  describe('value updates', () => {
    it('should emit fieldChanged when text input changes', async () => {
      const column = createMockColumn({ bulkEditable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      const input = wrapper.find('input');
      await input.setValue('new value');

      const emitted = wrapper.emitted('fieldChanged');
      expect(emitted).toBeDefined();
      expect(emitted![0]).toEqual(['test_column', 'new value']);
    });

    it('should emit fieldChanged when select value changes', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        enum: { value1: 'Value 1', value2: 'Value 2' },
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      const select = wrapper.find('select');
      await select.setValue('Value 1');

      const emitted = wrapper.emitted('fieldChanged');
      expect(emitted).toBeDefined();
      expect(emitted![0]).toEqual(['test_column', 'Value 1']);
    });

    it('should emit update:modelValue when value changes', async () => {
      const column = createMockColumn({ bulkEditable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: '',
          virtualRow: createMockVirtualRow(),
        },
      });

      const input = wrapper.find('input');
      await input.setValue('updated value');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeDefined();
      expect(emitted![0]).toEqual(['updated value']);
    });

    it('should close CVSS calculator on blur', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        cvss: true,
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: [],
          virtualRow: createMockVirtualRow(),
        },
      });

      // Open calculator by clicking on score div - find the div with form-control class
      const scoreDiv = wrapper.find('div.form-control');
      expect(scoreDiv.exists()).toBe(true);
      await scoreDiv.trigger('click');
      let calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
      expect(calculator.exists()).toBe(true);

      // Trigger blur by emitting the event
      await calculator.vm.$emit('blur');
      await wrapper.vm.$nextTick();

      // Calculator should be closed
      calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
      expect(calculator.exists()).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize with empty string for non-cvss fields', async () => {
      const column = createMockColumn({ bulkEditable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: undefined,
          virtualRow: createMockVirtualRow(),
        },
      });

      const input = wrapper.find('input');
      expect(input.element.value).toBe('');
    });

    it('should initialize with empty array for cvss fields', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        cvss: true,
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: undefined,
          virtualRow: createMockVirtualRow(),
        },
        global: {
          stubs: {
            CvssCalculatorBase: true,
          },
        },
      });

      // CVSS score should be 0 for empty array
      expect(wrapper.text()).toContain('0');
    });
  });

  describe('clear button', () => {
    it('should show clear button for clearable text input field', async () => {
      const column = createMockColumn({ bulkEditable: true, clearable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'some value',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      expect(clearButton.exists()).toBe(true);
      expect(clearButton.text()).toBe('×');
    });

    it('should show clear button for clearable select field', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        clearable: true,
        enum: { value1: 'Value 1', value2: 'Value 2' },
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'value1',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      expect(clearButton.exists()).toBe(true);
      expect(clearButton.text()).toBe('×');
    });

    it('should not show clear button for non-clearable field', async () => {
      const column = createMockColumn({ bulkEditable: true, clearable: false });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'some value',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      expect(clearButton.exists()).toBe(false);
    });

    it('should show clear button when clearable is undefined (defaults to true)', async () => {
      const column = createMockColumn({ bulkEditable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'some value',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      expect(clearButton.exists()).toBe(true);
    });

    it('should clear text input when clear button is clicked', async () => {
      const column = createMockColumn({ bulkEditable: true, clearable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'some value',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      await clearButton.trigger('click');

      const emittedUpdate = wrapper.emitted('update:modelValue');
      expect(emittedUpdate).toBeDefined();
      expect(emittedUpdate![emittedUpdate!.length - 1]).toEqual(['']);

      const emittedFieldChanged = wrapper.emitted('fieldChanged');
      expect(emittedFieldChanged).toBeDefined();
      expect(emittedFieldChanged![emittedFieldChanged!.length - 1]).toEqual(['test_column', '']);
    });

    it('should clear select when clear button is clicked', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        clearable: true,
        enum: { value1: 'Value 1', value2: 'Value 2' },
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'value1',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      await clearButton.trigger('click');

      const emittedUpdate = wrapper.emitted('update:modelValue');
      expect(emittedUpdate).toBeDefined();
      expect(emittedUpdate![emittedUpdate!.length - 1]).toEqual(['']);
    });

    it('should clear CVSS field when clear button is clicked', async () => {
      const column = createMockColumn({
        bulkEditable: true,
        clearable: true,
        cvss: true,
      });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: [{
            issuer: IssuerEnum.Rh,
            vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            score: 9.8,
          }] as ZodAffectCVSSType[],
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      await clearButton.trigger('click');

      const emittedUpdate = wrapper.emitted('update:modelValue');
      expect(emittedUpdate).toBeDefined();
      expect(emittedUpdate![emittedUpdate!.length - 1]).toEqual([[]]);
    });

    it('should emit applyBulkEdit when clear button is clicked', async () => {
      const column = createMockColumn({ bulkEditable: true, clearable: true });
      const wrapper = mount(BulkEditCell, {
        props: {
          column,
          modelValue: 'some value',
          virtualRow: createMockVirtualRow(),
        },
      });

      const clearButton = wrapper.find('button.btn-secondary');
      await clearButton.trigger('click');

      const emitted = wrapper.emitted('applyBulkEdit');
      expect(emitted).toBeDefined();
      expect(emitted!.length).toBe(1);
    });
  });
});
