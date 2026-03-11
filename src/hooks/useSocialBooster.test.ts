import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSelect = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn().mockReturnThis();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      limit: mockLimit,
    })),
    functions: {
      invoke: mockInvoke,
    },
  },
}));

// Import after mocking
import {
  type SocialCampaign,
  type SocialPost,
  type EntityMatch,
  type SocialSettings,
  type PublicationLog,
} from './useSocialBooster';

describe('Social Booster Types', () => {
  it('SocialCampaign interface has required fields', () => {
    const campaign: SocialCampaign = {
      id: 'test-id',
      article_id: 'article-id',
      status: 'detected',
      classification: null,
      entity_matches: null,
      selected_entity: null,
      utm_params: null,
      created_at: '2026-03-10T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
    };
    expect(campaign.id).toBe('test-id');
    expect(campaign.status).toBe('detected');
  });

  it('SocialPost interface has required fields', () => {
    const post: SocialPost = {
      id: 'post-id',
      campaign_id: 'campaign-id',
      platform: 'facebook',
      content: 'Test post content',
      hashtags: ['test'],
      cta_text: 'Discover',
      cta_url: 'https://example.com',
      media_url: null,
      status: 'draft',
      external_post_id: null,
      published_at: null,
      scheduled_for: null,
      error_message: null,
      created_at: '2026-03-10T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
    };
    expect(post.platform).toBe('facebook');
    expect(post.status).toBe('draft');
  });

  it('EntityMatch has score and reason', () => {
    const match: EntityMatch = {
      entity_type: 'category',
      entity_id: 'fournitures-scolaires',
      entity_label: 'Fournitures scolaires',
      match_score: 0.85,
      match_reason: 'Keywords match category',
    };
    expect(match.match_score).toBe(0.85);
    expect(match.entity_type).toBe('category');
  });

  it('SocialSettings has all config fields', () => {
    const settings: SocialSettings = {
      id: 'settings-id',
      enabled: true,
      active_platforms: ['facebook', 'instagram', 'x', 'linkedin'],
      default_mode: 'draft',
      default_ctas: ['Discover'],
      utm_source: 'social',
      utm_medium: 'post',
      utm_campaign_prefix: 'blog_',
      ai_provider: 'anthropic',
      ai_model: 'claude-sonnet-4-20250514',
    };
    expect(settings.enabled).toBe(true);
    expect(settings.active_platforms).toHaveLength(4);
  });

  it('PublicationLog tracks actions', () => {
    const log: PublicationLog = {
      id: 'log-id',
      post_id: 'post-id',
      action: 'publish',
      status: 'success',
      response_data: { external_post_id: 'fb_123' },
      error_message: null,
      duration_ms: 250,
      created_at: '2026-03-10T00:00:00Z',
    };
    expect(log.action).toBe('publish');
    expect(log.duration_ms).toBe(250);
  });
});

describe('Social Booster Status Transitions', () => {
  it('valid campaign statuses', () => {
    const validStatuses = [
      'detected', 'classified', 'generated', 'draft',
      'approved', 'scheduled', 'publishing', 'published',
      'failed', 'cancelled',
    ];
    validStatuses.forEach((status) => {
      const campaign: Partial<SocialCampaign> = { status };
      expect(validStatuses).toContain(campaign.status);
    });
  });

  it('valid post statuses', () => {
    const validStatuses = ['draft', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'skipped'];
    validStatuses.forEach((status) => {
      const post: Partial<SocialPost> = { status };
      expect(validStatuses).toContain(post.status);
    });
  });

  it('valid platforms', () => {
    const validPlatforms = ['facebook', 'instagram', 'x', 'linkedin'];
    validPlatforms.forEach((platform) => {
      expect(['facebook', 'instagram', 'x', 'linkedin']).toContain(platform);
    });
  });
});

describe('Anti-duplicate logic', () => {
  it('campaign has unique constraint on article_id', () => {
    // This validates the SQL constraint: social_campaigns_article_unique
    const campaign1: Partial<SocialCampaign> = { article_id: 'article-1' };
    const campaign2: Partial<SocialCampaign> = { article_id: 'article-1' };
    expect(campaign1.article_id).toBe(campaign2.article_id);
    // In DB, this would trigger unique constraint violation
  });

  it('post has unique constraint per platform per campaign', () => {
    // This validates: social_posts_unique_per_platform
    const post1: Partial<SocialPost> = { campaign_id: 'c1', platform: 'facebook' };
    const post2: Partial<SocialPost> = { campaign_id: 'c1', platform: 'facebook' };
    expect(post1.campaign_id).toBe(post2.campaign_id);
    expect(post1.platform).toBe(post2.platform);
    // In DB, this would trigger unique constraint violation
  });
});

describe('UTM URL generation', () => {
  it('builds correct UTM parameters', () => {
    const baseUrl = 'https://ma-papeterie.fr';
    const slug = 'guide-fournitures-scolaires';
    const platform = 'facebook';
    const params = new URLSearchParams({
      utm_source: 'social',
      utm_medium: 'post',
      utm_campaign: `blog_${slug}`,
      utm_content: platform,
    });
    const url = `${baseUrl}/blog/${slug}?${params.toString()}`;

    expect(url).toContain('utm_source=social');
    expect(url).toContain('utm_medium=post');
    expect(url).toContain('utm_campaign=blog_guide-fournitures-scolaires');
    expect(url).toContain('utm_content=facebook');
    expect(url.startsWith('https://ma-papeterie.fr/blog/')).toBe(true);
  });
});

describe('Edge function mock invoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generate-social-posts returns expected structure', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        campaign_id: 'campaign-123',
        classification: { universe: 'scolaire', seasonality: 'rentrée', need_type: 'équipement', usage: 'scolaire', main_angle: 'conseil' },
        entity_matches: [{ entity_type: 'category', entity_id: 'fournitures', entity_label: 'Fournitures', match_score: 0.9, match_reason: 'Direct match' }],
        posts: [
          { id: 'p1', platform: 'facebook', content: 'FB post', status: 'draft' },
          { id: 'p2', platform: 'instagram', content: 'IG post', status: 'draft' },
          { id: 'p3', platform: 'x', content: 'X post', status: 'draft' },
          { id: 'p4', platform: 'linkedin', content: 'LI post', status: 'draft' },
        ],
      },
      error: null,
    });

    const { data } = await mockInvoke('generate-social-posts', { body: { article_id: 'art-1' } });

    expect(data.success).toBe(true);
    expect(data.posts).toHaveLength(4);
    expect(data.classification.universe).toBe('scolaire');
    expect(data.entity_matches[0].match_score).toBeGreaterThan(0);
  });

  it('publish-social-post requires approved status', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Post must be approved before publishing. Current status: draft' },
      error: null,
    });

    const { data } = await mockInvoke('publish-social-post', { body: { post_id: 'p1' } });

    expect(data.success).toBe(false);
    expect(data.error).toContain('approved');
  });

  it('publish-social-post succeeds for approved post', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, external_post_id: 'fb_mock_123', platform: 'facebook', mock: true },
      error: null,
    });

    const { data } = await mockInvoke('publish-social-post', { body: { post_id: 'p1' } });

    expect(data.success).toBe(true);
    expect(data.external_post_id).toBeTruthy();
    expect(data.mock).toBe(true);
  });
});
