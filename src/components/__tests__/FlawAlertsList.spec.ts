import { VueWrapper, mount } from '@vue/test-utils';
import { sampleFlaw_1 } from './__sampledata__/sampleFlaws';
import { AlertTypeEnum } from '@/generated-client';
import { randomUUID } from 'crypto';
import FlawAlertsList from '../FlawAlertsList.vue';
import FlawAlertsSection from '../FlawAlertsSection.vue';
import type { ZodAlertType } from '@/types/zodShared';

function sampleAlert(alertType: AlertTypeEnum, parentUuid: string, parentModel: string): ZodAlertType {
  return {
    uuid: String(randomUUID()),
    name: 'big_alert',
    description: `this is ${alertType}`,
    alert_type: alertType,
    parent_uuid: parentUuid,
    parent_model: parentModel,
    resolution_steps: 'fix it'
  };
}

describe('AlertsList', () => {
  function mountWithProps(props: typeof FlawAlertsList.$props = { flaw: sampleFlaw_1 }) {
    subject = mount(FlawAlertsList, {
      props,
    });
  }

  let subject: VueWrapper<InstanceType<typeof FlawAlertsList>>;
  beforeEach(() => {
    subject = mount(FlawAlertsList, {
      props: {
        'flaw': sampleFlaw_1
      },
    });
  });

  it('mounts and renders', async () => {
    expect(subject.exists()).toBe(true);
    expect(subject.vm).toBeDefined();
  });

  it('is not vissible when no alerts are present', async () => {
    const comp = subject.findComponent(FlawAlertsList);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(false);
  });

  it('is vissible when alerts are present', async () => {
    const flaw = sampleFlaw_1;
    flaw.alerts.push(sampleAlert('ERROR', flaw.uuid, 'flaw'));
    mountWithProps({ flaw });
    const comp = subject.findComponent(FlawAlertsList);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(true);
  });

  it('respective sections are visible based on alerts existence', async () => {
    const flaw = sampleFlaw_1;
    flaw.alerts.push(sampleAlert('ERROR', flaw.uuid, 'flaw'));
    flaw.comments[0].alerts.push(sampleAlert('ERROR', flaw.comments[0].uuid, 'flawacomment'));
    mountWithProps({ flaw });

    const compList = subject.findAllComponents(FlawAlertsSection);

    const flawSection = compList.find((component) => component.props().sectionName === 'Flaw');
    expect(flawSection?.exists()).toBe(true);
    expect(flawSection?.isVisible()).toBe(true);

    const affectsSection = compList.find((component) => component.props().sectionName === 'Affects');
    expect(affectsSection?.exists()).toBe(true);
    expect(affectsSection?.isVisible()).toBe(false);

    const flawCommentSection = compList.find(
      (component) => component.props().sectionName === 'Flaw Comments'
    );
    expect(flawCommentSection?.exists()).toBe(true);
    expect(flawCommentSection?.isVisible()).toBe(true);
  });
});
