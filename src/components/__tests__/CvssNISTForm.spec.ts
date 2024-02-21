import { VueWrapper, mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect } from 'vitest';

import CvssNISTForm from '../CvssNISTForm.vue';

import { createTestingPinia } from "@pinia/testing";

describe('CvssNISTForm', () => {
	it('renders a button', () => {
		const pinia = createTestingPinia({
			createSpy: vitest.fn,
			stubActions: false,
		});
		const wrapper = mount(CvssNISTForm, {
			props: {
				flaw: 'any',
				cveid: 'string',
				flawSummary: 'string',
				bugzilla: 'string',
				nvdpage: 'string',
				cvss: 'string',
				nistcvss: 'string',
				cvssjustification: 'string',
			},
			global: {
				plugins: [
					pinia
				]
			}
		});
		const button = wrapper.find('button');
		expect(button.exists()).toBeTruthy();
		expect(button.text()).toBe('Email NIST');
	});

	it('does not render modal before clicking the button', () => {
		const pinia = createTestingPinia({
			createSpy: vitest.fn,
			stubActions: false,
		});
		const wrapper = mount(CvssNISTForm, {
			props: {
				flaw: 'any',
				cveid: 'string',
				flawSummary: 'string',
				bugzilla: 'string',
				nvdpage: 'string',
				cvss: 'string',
				nistcvss: 'string',
				cvssjustification: 'string',
			},
			global: {
				plugins: [
					pinia,
				]
			}
		});
		const button = wrapper.find('button');
		expect(button.exists()).toBeTruthy();
		expect(wrapper.find('div.modal-content').exists()).toBe(false);
	});

	it('renders a modal when clicking the button', async () => {
		const pinia = createTestingPinia({
			createSpy: vitest.fn,
			stubActions: false,
		});
		const wrapper = mount(CvssNISTForm, {
			props: {
				flaw: 'any',
				cveid: 'string',
				flawSummary: 'string',
				bugzilla: 'string',
				nvdpage: 'string',
				cvss: 'string',
				nistcvss: 'string',
				cvssjustification: 'string',
			},
			global: {
				plugins: [
					pinia,
				]
			}
		});
		const button = wrapper.find('button');
		await button.trigger('click');
		await flushPromises();

		expect(wrapper.find('div.modal-content').exists()).toBeTruthy();
		expect(wrapper.find('input.form-control').exists()).toBeTruthy();
		expect(wrapper.find('textarea.form-control').exists()).toBeTruthy();
		expect(wrapper.find('label.osim-input').exists()).toBeTruthy();
		expect(wrapper.find('button.cancel-btn').text()).toBe('Cancel');
		expect(wrapper.find('button.send-email').text()).toBe('Send Email');
		expect(wrapper.find('span.to-email').text()).toBe('nvd@nist.gov');
		expect(wrapper.find('span.cc-email').text()).toBe('secalert@redhat.com');
		expect(wrapper.find('p.from-email').exists()).toBeTruthy();
	});

});