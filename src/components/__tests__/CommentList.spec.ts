import { describe, it, expect } from 'vitest';

import CommentList from '@/components/FlawComments/CommentList.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import { CommentType } from '@/constants';
import { type ZodFlawCommentType } from '@/types/zodFlaw';

const createTestComment = (text: string, type: CommentType = CommentType.Public): ZodFlawCommentType => ({
  uuid: 'test-uuid',
  external_system_id: 'test-id',
  alerts: [],
  creator: 'testuser',
  text,
  created_dt: '2023-09-20T14:50:50Z',
  type,
});

describe('commentList', () => {
  it('should not parse grep output with pipes as links', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment(
        'rhel-8.10.z    pkg:oci/dotnet-80?repository_url=registry.example.com/rhel8/dotnet-80'
        + '     (dotnet-8.0.122.0, nuget)',
      ),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    // Should NOT contain an anchor tag since there's no valid Jira link syntax
    expect(commentText.html()).not.toContain('<a');
    expect(commentText.text()).toContain('rhel-8.10.z');
    expect(commentText.text()).toContain('pkg:oci/dotnet-80');
  });

  it('should parse valid Jira link syntax [text|url]', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment(
        'Check this link: [Example Docs|https://example.com/docs/policy]',
      ),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    // Should contain an anchor tag with the proper URL
    expect(commentText.html())
      .toContain('<a target="_blank" href="https://example.com/docs/policy">');
  });

  it('should parse bugzilla bug references', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment('See [bug 12345] for details'),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    expect(commentText.html()).toContain('[bug 12345]</a>');
    expect(commentText.html()).toContain('show_bug.cgi?id=12345');
  });

  it('should parse Jira user tags', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment('Hey [~someuser] can you check this?'),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    expect(commentText.html()).toContain('ViewProfile.jspa?name=someuser');
    expect(commentText.html()).toContain('>someuser</a>');
  });

  it('should handle text with multiple grep-style pipes without creating links', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment(`"newcli -vvs dotnet | grep rhel-8.10"

rhel-8.10.z    pkg:oci/dotnet-80?repository_url=registry.example.com/rhel8/dotnet-80     (dotnet-8.0.122.0, nuget)
rhel-8.10.z    pkg:oci/dotnet-80?repository_url=registry.example.com/ubi8/dotnet-80     (dotnet-8.0.122.0, nuget)
rhel-8.10.z    pkg:oci/dotnet-90?repository_url=registry.example.com/rhel8/dotnet-90     (dotnet-9.0.112.0, nuget)`),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    // Should NOT contain any anchor tags from the grep output
    const anchorCount = (commentText.html().match(/<a /g) || []).length;
    expect(anchorCount).toBe(0);
  });

  it('should handle mixed content with valid and invalid link patterns', () => {
    const comments: ZodFlawCommentType[] = [
      createTestComment(
        'See [bug 123] and [Example Site|https://example.com] but not this: '
        + 'rhel-8.10.z pkg:oci/test (version, nuget)',
      ),
    ];

    const wrapper = mountWithConfig(CommentList, {
      props: {
        commentList: comments,
      },
    });

    const commentText = wrapper.find('.osim-flaw-comment');
    // Should have exactly 2 links: bug ref and valid Jira link
    const anchorCount = (commentText.html().match(/<a /g) || []).length;
    expect(anchorCount).toBe(2);
    expect(commentText.html()).toContain('show_bug.cgi?id=123');
    expect(commentText.html()).toContain('href="https://example.com"');
  });
});
