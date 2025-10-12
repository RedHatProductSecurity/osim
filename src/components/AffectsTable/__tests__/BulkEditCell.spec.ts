import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { Column } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';

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

      // Click to open calculator
      const scoreDiv = wrapper.findAll('div').find(div => div.text().includes('0'));
      if (scoreDiv) {
        await scoreDiv.trigger('click');

        const calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
        expect(calculator.exists()).toBe(true);
      }
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

      // Open calculator by clicking on score div
      const scoreDiv = wrapper.findAll('div').find(div => div.text().includes('0'));
      if (scoreDiv) {
        await scoreDiv.trigger('click');
        let calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
        expect(calculator.exists()).toBe(true);

        // Trigger blur by emitting the event
        await calculator.vm.$emit('blur');
        await wrapper.vm.$nextTick();

        // Calculator should be closed
        calculator = wrapper.findComponent({ name: 'CvssCalculatorBase' });
        expect(calculator.exists()).toBe(false);
      }
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
});
