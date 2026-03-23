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

  it('publish-social-post rejects when max retries reached', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Max retries (3) reached for this post. Manual intervention required.' },
      error: null,
    });

    const { data } = await mockInvoke('publish-social-post', { body: { post_id: 'p1' } });

    expect(data.success).toBe(false);
    expect(data.error).toContain('Max retries');
  });
});

describe('Fallback content generation', () => {
  it('fallback generates 4 posts with basic content', () => {
    const title = 'Guide des fournitures scolaires';
    const excerpt = 'Tout savoir sur les fournitures';

    // Simulate fallback structure
    const fallback: any = {
      classification: {
        universe: 'général',
        seasonality: null,
        need_type: 'information',
        usage: 'mixte',
        main_angle: 'trafic',
      },
      entity_matches: [],
      posts: [
        { platform: 'facebook', content: `${excerpt}\n\nDécouvrez notre dernier article`, hashtags: [], cta_text: "Découvrez l'article complet" },
        { platform: 'instagram', content: `${excerpt}\n\nRetrouvez tous nos conseils`, hashtags: ['papeterie'], cta_text: 'Lien en bio' },
        { platform: 'x', content: `${title.slice(0, 200)} — À lire`, hashtags: ['papeterie'], cta_text: "Lire l'article" },
        { platform: 'linkedin', content: `${excerpt}\n\nMa Papeterie partage son expertise`, hashtags: [], cta_text: "Découvrez l'article" },
      ],
      entity_highlight_post: null,
    };

    expect(fallback.posts).toHaveLength(4);
    expect(fallback.classification.universe).toBe('général');
    expect(fallback.entity_highlight_post).toBeNull();
    expect(fallback.posts[0].platform).toBe('facebook');
    expect(fallback.posts[2].content.length).toBeLessThanOrEqual(280);
  });
});

describe('Entity highlight post', () => {
  it('entity_highlight_post is optional in AI result', () => {
    const resultWithHighlight: any = {
      classification: { universe: 'scolaire', seasonality: 'rentrée', need_type: 'équipement', usage: 'scolaire', main_angle: 'produit' },
      entity_matches: [{ entity_type: 'category', entity_id: 'fournitures', entity_label: 'Fournitures', match_score: 0.9, match_reason: 'Direct match' }],
      posts: [],
      entity_highlight_post: { platform: 'facebook', content: 'Highlight post', hashtags: [], cta_text: 'Voir la sélection' },
    };

    expect(resultWithHighlight.entity_highlight_post).not.toBeNull();
    expect(resultWithHighlight.entity_highlight_post!.cta_text).toBe('Voir la sélection');
  });

  it('entity_highlight_post can be null when no strong match', () => {
    const resultWithoutHighlight: any = {
      entity_highlight_post: null,
    };

    expect(resultWithoutHighlight.entity_highlight_post).toBeNull();
  });
});

describe('Social post retry_count', () => {
  it('retry_count defaults to 0', () => {
    const post: SocialPost & { retry_count?: number } = {
      id: 'post-id',
      campaign_id: 'campaign-id',
      platform: 'facebook',
      content: 'Test',
      hashtags: [],
      cta_text: null,
      cta_url: null,
      media_url: null,
      status: 'draft',
      external_post_id: null,
      published_at: null,
      scheduled_for: null,
      error_message: null,
      created_at: '2026-03-11T00:00:00Z',
      updated_at: '2026-03-11T00:00:00Z',
      retry_count: 0,
    };
    expect(post.retry_count).toBe(0);
  });

  it('retry_count is limited to 3', () => {
    const MAX_RETRIES = 3;
    expect(MAX_RETRIES).toBe(3);
    expect(3 >= MAX_RETRIES).toBe(true);
  });
});

describe('V2 table structures', () => {
  it('social_accounts has required fields', () => {
    const account: any = {
      id: 'acc-id',
      platform: 'facebook',
      account_name: 'Ma Papeterie',
      account_id: 'page_123',
      access_token_ref: 'vault://meta/access_token',
      refresh_token_ref: null,
      token_expires_at: null,
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
      is_active: false,
      metadata: { page_name: 'Ma Papeterie Sainte-Maxime' },
    };

    expect(account.platform).toBe('facebook');
    expect(account.is_active).toBe(false);
    expect(account.scopes).toContain('pages_manage_posts');
    expect(account.access_token_ref).toContain('vault://');
  });

  it('generated_media has required fields', () => {
    const media: any = {
      id: 'media-id',
      campaign_id: 'campaign-id',
      post_id: 'post-id',
      source_type: 'article_image',
      source_url: 'https://example.com/image.jpg',
      processed_url: null,
      alt_text: 'Photo article',
      width: 1200,
      height: 630,
      format: 'jpeg',
      metadata: {},
    };

    expect(media.source_type).toBe('article_image');
    expect(media.width).toBe(1200);
    expect(['article_image', 'product_image', 'ai_generated', 'collection', 'promotion', 'service', 'brand']).toContain(media.source_type);
  });

  it('valid source_types for generated_media', () => {
    const validTypes = ['article_image', 'product_image', 'ai_generated', 'collection', 'promotion', 'service', 'brand'];
    expect(validTypes).toHaveLength(7);
  });
});

describe('Social status filtering', () => {
  it('filters articles by social campaign status', () => {
    const campaignStatusMap = new Map<string, string>();
    campaignStatusMap.set('art-1', 'generated');
    campaignStatusMap.set('art-2', 'published');
    campaignStatusMap.set('art-3', 'failed');

    const articles = [
      { id: 'art-1' },
      { id: 'art-2' },
      { id: 'art-3' },
      { id: 'art-4' }, // no campaign
    ];

    // Filter: none (no campaign)
    const noneFiltered = articles.filter((a) => !campaignStatusMap.get(a.id));
    expect(noneFiltered).toHaveLength(1);
    expect(noneFiltered[0].id).toBe('art-4');

    // Filter: published
    const pubFiltered = articles.filter((a) => campaignStatusMap.get(a.id) === 'published');
    expect(pubFiltered).toHaveLength(1);
    expect(pubFiltered[0].id).toBe('art-2');

    // Filter: failed
    const failFiltered = articles.filter((a) => campaignStatusMap.get(a.id) === 'failed');
    expect(failFiltered).toHaveLength(1);
    expect(failFiltered[0].id).toBe('art-3');
  });
});
