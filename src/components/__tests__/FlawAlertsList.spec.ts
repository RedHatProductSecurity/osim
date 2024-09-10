import { randomUUID } from 'node:crypto';

import { VueWrapper, mount } from '@vue/test-utils';

import { AlertTypeEnum } from '@/generated-client';
import type { ZodAlertType } from '@/types/zodShared';

import { osimEmptyFlawTest, osimFullFlawTest } from './test-suite-helpers';
import FlawAlertsList from '../FlawAlertsList.vue';
import FlawAlertsSection from '../FlawAlertsSection.vue';

function sampleAlert(alertType: AlertTypeEnum, parentUuid: string, parentModel: string): ZodAlertType {
  return {
    uuid: String(randomUUID()),
    name: 'big_alert',
    description: `this is ${alertType}`,
    alert_type: alertType,
    parent_uuid: parentUuid,
    parent_model: parentModel,
    resolution_steps: 'fix it',
  };
}

describe('alertsList', () => {
  let subject: VueWrapper<InstanceType<typeof FlawAlertsList>>;

  osimFullFlawTest('mounts and renders', async ({ flaw }) => {
    subject = mount(FlawAlertsList, {
      props: {
        flaw: flaw,
      },
    });
    expect(subject.exists()).toBe(true);
    expect(subject.vm).toBeDefined();
  });

  osimEmptyFlawTest('is not vissible when no alerts are present', async ({ flaw }) => {
    subject = mount(FlawAlertsList, {
      props: {
        flaw: flaw,
      },
    });
    const comp = subject.findComponent(FlawAlertsList);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(false);
  });

  osimFullFlawTest('is vissible when alerts are present', async ({ flaw }) => {
    flaw.alerts.push(sampleAlert('ERROR', flaw.uuid, 'flaw'));
    subject = mount(FlawAlertsList, {
      props: {
        flaw: flaw,
      },
    });
    const comp = subject.findComponent(FlawAlertsList);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(true);
  });

  osimFullFlawTest('respective sections are visible based on alerts existence', async ({ flaw }) => {
    flaw.alerts.push(sampleAlert('ERROR', flaw.uuid, 'flaw'));
    flaw.comments[0].alerts.push(sampleAlert('ERROR', flaw.comments[0].uuid, 'flawacomment'));
    subject = mount(FlawAlertsList, {
      props: {
        flaw: flaw,
      },
    });

    const compList = subject.findAllComponents(FlawAlertsSection);

    const flawSection = compList.find(component => component.props().sectionName === 'Flaw');
    expect(flawSection?.exists()).toBe(true);
    expect(flawSection?.isVisible()).toBe(true);

    const affectsSection = compList.find(component => component.props().sectionName === 'Affects');
    expect(affectsSection?.exists()).toBe(true);
    expect(affectsSection?.isVisible()).toBe(false);

    const flawCommentSection = compList.find(
      component => component.props().sectionName === 'Flaw Comments',
    );
    expect(flawCommentSection?.exists()).toBe(true);
    expect(flawCommentSection?.isVisible()).toBe(true);
  });
});
