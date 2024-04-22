import { describe, it, expect } from 'vitest';
import { VueWrapper, mount } from '@vue/test-utils';
import EditableDate from '../EditableDate.vue';
import { IMaskDirective } from 'vue-imask';
import { type Directive } from 'vue';

describe('EditableDate', () => {
  const testDateString = '2024-04-16T20:08:31.831Z';
  let subject: VueWrapper<InstanceType<typeof EditableDate>>;

  beforeEach(() => {
    subject = mount(EditableDate, {
      directives: {
        imask: IMaskDirective as Directive,
      },
      props: {
        modelValue: testDateString,
      },
    });
  });

  it('renders properly', () => {

    expect(subject.exists()).toBeTruthy();
  });
  
  it('displays the right date', () => {
    const dateDisplay = subject.find('.osim-editable-date-value');
    expect(dateDisplay.element?.textContent).toBe(testDateString.split('T')[0]);
  });

  it('goes into edit mode on click', async () => {
    const editPencil = subject.find('.osim-editable-date-pen');
    await editPencil.trigger('click');
    const editField = subject.find('.input-group.osim-date-edit-field');
    expect(editField.exists()).toBeTruthy();
  });

  it('exits edit mode on cancel button click (mouseup)', async () => {
    const editPencil = subject.find('.osim-editable-date-pen');
    await editPencil.trigger('click');
    const editField = subject.find('.input-group.osim-date-edit-field');
    const closeButton = editField.find('.osim-cancel');
    await closeButton.trigger('mouseup');
    expect(subject.find('.osim-editable-date-pen').exists()).toBeTruthy();
  });

  it('exits edit mode on confirmation button click (mouseup)', async () => {
    const editPencil = subject.find('.osim-editable-date-pen');
    await editPencil.trigger('click');
    const editField = subject.find('.input-group.osim-date-edit-field');
    const closeButton = editField.find('.osim-confirm');
    await closeButton.trigger('mouseup');
    expect(subject.find('.osim-editable-date-pen').exists()).toBeTruthy();
  });

  it('updates date on confirmation button click (mouseup)', async () => {
    const updatedDateString = '2020-04-16';
    const editPencil = subject.find('.osim-editable-date-pen');
    await editPencil.trigger('click');
    const editField = subject.find('.input-group.osim-date-edit-field');
    await subject.setProps({ modelValue: updatedDateString });
    const closeButton = editField.find('.osim-confirm');
    await closeButton.trigger('mouseup');
    expect(subject.find('.osim-editable-date-pen').exists()).toBeTruthy();
    const dateDisplay = subject.find('.osim-editable-date-value');
    expect(dateDisplay.element?.textContent).toBe(updatedDateString);
  });

  it('indicates when a date is invalid', async () => {
    const editPencil = subject.find('.osim-editable-date-pen');
    await editPencil.trigger('click');
    const editField = subject.find('.input-group.osim-date-edit-field');
    await subject.setProps({ modelValue: '99999-13-16' });
    const closeButton = editField.find('.osim-confirm');
    await closeButton.trigger('mouseup');
    expect(subject.find('.osim-editable-date-pen').exists()).toBeTruthy();
    const dateDisplay = subject.find('.osim-editable-date-value');
    expect(dateDisplay.element?.textContent).toBe('Invalid Date');
  });
});
