import { getJiraIssue, searchJiraUsers } from '@/services/JiraService';
import useJiraContributors from '../useJiraContributors';
import type { ZodJiraContributorType, ZodJiraUserPickerType } from '@/types/zodJira';

vi.mock('@/services/JiraService', () => ({
  getJiraIssue: vi.fn().mockResolvedValue({}),
  searchJiraUsers: vi.fn().mockResolvedValue({})
}));

describe('useJiraContributors', () => {
  const mockUsers: ZodJiraUserPickerType[] = [
    {
      displayName: 'Alvaro Tinoco',
      name: 'atinoco',
      html: 'Alvaro <b>Tinoco</b>',
    },
    {
      displayName: 'John Doe',
      name: 'jdoe',
      html: 'John <b>Doe</b>',
    },
  ];

  const mockContributors: ZodJiraContributorType[] = [
    {
      displayName: 'Alvaro Tinoco',
      name: 'atinoco',
      emailAddress: 'email@test.com',
      self: 'https://jira.com',
    },
    {
      displayName: 'John Doe',
      name: 'jdoe',
      emailAddress: 'email@test.com',
      self: 'https://jira.com',
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
          customfield_12315950: mockContributors,
        }
      }
    });
    const { contributors, loadJiraContributors } = useJiraContributors('task_key');

    await loadJiraContributors();

    expect(getJiraIssue).toHaveBeenCalledWith('task_key');
    expect(contributors.value).toEqual(mockContributors);
  });

  describe('searchContributors', () => {
    beforeEach(() => {
      vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValue({
        data: {
          users: mockUsers,
        }
      });
    });

    it('should search contributors', async () => {
      const { searchContributors } = useJiraContributors('task_key');

      const result = await searchContributors('Alvaro');

      expect(searchJiraUsers).toHaveBeenCalledWith('Alvaro');
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
