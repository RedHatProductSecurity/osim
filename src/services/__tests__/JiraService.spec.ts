import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';

import { useSettingsStore } from '@/stores/SettingsStore';
import { osimRuntime } from '@/stores/osimRuntime';
import { getJiraTransitions, postJiraTransition, closeJiraIssue, getCloseTransition,
  type JiraTransition } from '@/services/JiraService';

vi.mock('@/stores/UserStore', () => ({ useUserStore: () => ({ userEmail: 'test@example.com' }) }));

const transition: JiraTransition = {
  id: '31',
  name: 'Finish',
  to: { name: 'Closed' },
  fields: {
    resolution: { name: 'Resolution',
      required: true,
      operations: ['set'],
      allowedValues: [
        { id: '10000', name: 'Done' }, { id: '10001', name: 'Won\'t Do' },
      ] },
    customfield_10873: { name: 'VEX Justification',
      required: true,
      operations: ['set'],
      allowedValues: [{ id: '17000', value: 'Component not Present' }] },
  },
};

const ok = (data: unknown) => ({
  ok: true, status: 200, json: async () => data, headers: new Map(),
}) as unknown as Response;
const empty = () => ({ ok: true, status: 204, headers: new Map() }) as unknown as Response;

describe('jira close transition', () => {
  beforeAll(() => {
    createTestingPinia();
    useSettingsStore().apiKeys = { jiraApiKey: 'test-token', bugzillaApiKey: '' };
    // @ts-expect-error mutable in tests
    osimRuntime.value.backends.jira = 'https://jira.example.com';
  });
  afterEach(() => vi.restoreAllMocks());

  it('discovers fields and finds Closed by destination, not transition name', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(ok({ transitions: [
      { id: '11', name: 'Close', to: { name: 'Done' } }, transition,
    ] }));
    const { data } = await getJiraTransitions('RHEL-1');
    expect((global.fetch as any).mock.calls[0][0]).toContain('expand=transitions.fields');
    expect(getCloseTransition(data!.transitions)).toEqual(transition);
    expect(getCloseTransition([{ id: '11', name: 'Done', to: { name: 'Done' } }])).toBeUndefined();
  });

  it('sends resolution, VEX and ADF comment together in one request', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(empty());
    await closeJiraIssue('RHEL-1', transition, {
      resolution: '10001', vexJustification: '17000', comment: 'Not affected',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((global.fetch as any).mock.calls[0][1].body)).toEqual({
      transition: { id: '31' },
      fields: { resolution: { id: '10001' }, customfield_10873: { id: '17000' } },
      update: { comment: [{ add: { body: { type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Not affected' }] }] } } }] },
    });
  });

  it('does not write for invalid or missing required choices', async () => {
    const spy = vi.spyOn(global, 'fetch');
    await expect(postJiraTransition('RHEL-1', transition, { resolution: 'invalid', vexJustification: '17000' }))
      .rejects.toThrow(/resolution/);
    await expect(postJiraTransition('RHEL-1', transition, { resolution: '10001' }))
      .rejects.toThrow(/VEX justification required/);
    expect(spy).not.toHaveBeenCalled();
  });
});
