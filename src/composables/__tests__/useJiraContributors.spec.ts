import { getJiraIssue, searchJiraUsers } from '@/services/JiraService';
import type { ZodJiraContributorType, ZodJiraUserAssignableType } from '@/types/zodJira';

import useJiraContributors from '../useJiraContributors';

vi.mock('@/services/JiraService', () => ({
  getJiraIssue: vi.fn().mockResolvedValue({}),
  searchJiraUsers: vi.fn().mockResolvedValue({}),
}));

describe('useJiraContributors', () => {
  const mockUsers: ZodJiraUserAssignableType[] = [
    {
      accountId: 'account-id-1',
      displayName: 'Alvaro Tinoco',
      emailAddress: 'atinoco@example.com',
    },
    {
      accountId: 'account-id-2',
      displayName: 'John Doe',
      emailAddress: 'jdoe@example.com',
    },
  ];

  const mockContributors: ZodJiraContributorType[] = [
    {
      accountId: 'account-id-1',
      displayName: 'Alvaro Tinoco',
      emailAddress: 'atinoco@example.com',
      self: 'https://redhat.atlassian.net/rest/api/3/user?accountId=account-id-1',
    },
    {
      accountId: 'account-id-2',
      displayName: 'John Doe',
      emailAddress: 'jdoe@example.com',
      self: 'https://redhat.atlassian.net/rest/api/3/user?accountId=account-id-2',
    },
  ];

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initiate with empty contributors', () => {
    const { contributors } = useJiraContributors('task_key');
    expect(contributors.value).toEqual([]);
  });

  it('should load contributors', async () => {
    vi.mocked(getJiraIssue, { partial: true }).mockResolvedValue({
      data: {
        id: '123',
        self: 'https://jira.com',
        key: 'key',
        fields: {
          customfield_10466: mockContributors,
        },
      },
    });
    const { contributors, loadJiraContributors } = useJiraContributors('task_key');

    await loadJiraContributors();

    expect(getJiraIssue).toHaveBeenCalledWith('task_key');
    expect(contributors.value).toEqual(mockContributors);
  });

  describe('searchContributors', () => {
    beforeEach(() => {
      vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValue({
        data: mockUsers,
      });
    });

    it('should search contributors', async () => {
      const { searchContributors } = useJiraContributors('task_key');

      const result = await searchContributors('Alvaro');

      expect(searchJiraUsers).toHaveBeenCalledWith('Alvaro', 'task_key');
      expect(result).toEqual(mockUsers);
    });

    it('should not search if query is empty', async () => {
      const { searchContributors } = useJiraContributors('task_key');

      const result = await searchContributors('');

      expect(searchJiraUsers).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should memoize search', async () => {
      const { searchContributors } = useJiraContributors('task_key');

      await searchContributors('Alvaro');
      await searchContributors('Alvaro');

      expect(searchJiraUsers).toHaveBeenCalledTimes(1);
    });
  });
});
