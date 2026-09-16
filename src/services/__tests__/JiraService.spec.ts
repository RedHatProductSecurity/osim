import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';

import { useSettingsStore } from '@/stores/SettingsStore';
import { osimRuntime } from '@/stores/osimRuntime';
import { getJiraTransitions, postJiraTransition, closeJiraIssue } from '@/services/JiraService';

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    userEmail: 'test@example.com',
  }),
}));

describe('jiraService', () => {
  beforeAll(() => {
    createTestingPinia();
    const settingsStore = useSettingsStore();
    settingsStore.apiKeys = { jiraApiKey: 'test-token', bugzillaApiKey: '' };
    // @ts-expect-error osimRuntime is readonly in runtime, but mutable during testing
    osimRuntime.value.backends.jira = 'https://jira.example.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getJiraTransitions', () => {
    it('returns transitions list', async () => {
      const mockTransitions = { transitions: [{ id: '31', name: 'Close' }] };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransitions,
        headers: new Map(),
      } as any);

      const result = await getJiraTransitions('TEST-123');

      const calls = (global.fetch as any).mock.calls;
      expect(calls[0][0]).toContain('/rest/api/3/issue/TEST-123/transitions');
      expect(calls[0][1].method.toUpperCase()).toBe('GET');
      expect(result.data).toEqual(mockTransitions);
    });
  });

  describe('postJiraTransition', () => {
    it('sends correct body', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map(),
      } as any);

      await postJiraTransition('TEST-123', '31');

      const calls = (global.fetch as any).mock.calls;
      expect(calls[0][0]).toContain('/rest/api/3/issue/TEST-123/transitions');
      expect(calls[0][1].method.toUpperCase()).toBe('POST');
      expect(calls[0][1].body).toBe(JSON.stringify({ transition: { id: '31' } }));
    });
  });

  describe('closeJiraIssue', () => {
    it('finds "Close" transition and calls it', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'In Progress' },
          { id: '31', name: 'Close' },
        ],
      };

      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockTransitions,
          headers: new Map(),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Map(),
        } as any);

      await closeJiraIssue('TEST-123');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws when no close transition exists', async () => {
      const mockTransitions = {
        transitions: [{ id: '11', name: 'In Progress' }],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransitions,
        headers: new Map(),
      } as any);

      await expect(closeJiraIssue('TEST-123')).rejects.toThrow(
        /No close transition/,
      );
    });

    it('matches "Done" as a close transition', async () => {
      const mockTransitions = {
        transitions: [{ id: '41', name: 'Done' }],
      };

      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockTransitions,
          headers: new Map(),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Map(),
        } as any);

      await expect(closeJiraIssue('TEST-123')).resolves.toBeDefined();
    });
  });
});
