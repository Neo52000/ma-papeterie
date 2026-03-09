# SEO Machine Integration Reference

## Overview
SEO Machine is a comprehensive Claude Code workspace for creating long-form, SEO-optimized blog content. This tool could significantly enhance ma-papeterie's content strategy for B2B e-commerce.

## Key Features for B2B E-commerce

### Content Creation Workflow
- **`/research [topic]`**: Comprehensive keyword research and competitive analysis
- **`/write [topic]`**: Creates 2000-3000+ word SEO-optimized articles
- **`/optimize [file]`**: Final SEO optimization pass with scoring
- **`/analyze-existing [URL]`**: Content health analysis for existing pages

### Specialized Commands for E-commerce
- **`/landing-write [topic]`**: Conversion-optimized landing pages for products
- **`/landing-audit [file]`**: CRO analysis for product pages
- **`/performance-review`**: Data-driven content prioritization

### Analytics Integration
- Google Analytics 4 traffic analysis
- Google Search Console ranking data
- DataForSEO competitive intelligence
- Real-time performance metrics

## Integration Opportunities for ma-papeterie

### Product Content Optimization
```bash
# Research product category keywords
/research school supplies pricing strategies

# Write product-focused content
/write bulk school supplies for B2B buyers

# Analyze existing product pages
/analyze-existing https://ma-papeterie.com/products/notebooks
```

### Blog Content Strategy
```bash
# Research educational content topics
/research back-to-school planning for schools

# Create long-form educational content
/write comprehensive school supply guide 2025

# Optimize for search rankings
/optimize drafts/school-supply-guide-2025.md
```

### Landing Page Creation
```bash
# Create product landing pages
/landing-write bulk notebook orders for schools

# Audit conversion optimization
/landing-audit landing-pages/bulk-notebooks.md
```

## Context File Setup for ma-papeterie

### Required Context Files
- **`context/brand-voice.md`**: Define B2B educational supply voice
- **`context/target-keywords.md`**: School supply and educational keywords
- **`context/internal-links-map.md`**: Product category and supplier pages
- **`context/competitor-analysis.md`**: Key competitors in school supplies

### B2B-Specific Configuration
```json
// config/competitors.json
{
  "competitors": [
    "https://www.staples.com",
    "https://www.officedepot.com",
    "https://www.amazon.com/school-supplies"
  ],
  "keywords": [
    "bulk school supplies",
    "educational supplies wholesale",
    "school office supplies B2B"
  ]
}
```

## Workflow Integration

### Monthly Content Calendar
1. **Week 1**: Research trending educational topics
   ```bash
   /research back-to-school trends 2025
   /research-serp school supply shortages
   ```

2. **Week 2**: Create pillar content
   ```bash
   /write comprehensive school supply guide
   /write B2B pricing strategies for education
   ```

3. **Week 3**: Optimize and publish
   ```bash
   /optimize drafts/school-supply-guide.md
   /publish-draft drafts/school-supply-guide.md
   ```

4. **Week 4**: Performance review and updates
   ```bash
   /performance-review
   /analyze-existing https://ma-papeterie.com/blog/top-supplies
   ```

## Technical Integration with ma-papeterie

### WordPress Publishing Setup
```php
// wordpress/seo-machine-yoast-rest.php
// Custom MU-plugin for Yoast SEO integration
// Configure in .env:
WP_URL=https://ma-papeterie.com
WP_USERNAME=content_team
WP_APP_PASSWORD=generated_app_password
```

### Analytics Data Flow
- Import Google Analytics data for content performance
- Track product page conversions
- Monitor B2B buyer journey analytics
- Generate content prioritization reports

## Quality Standards Alignment

### Content Requirements
- **Length**: 2,000-3,000+ words for pillar content
- **SEO**: Primary keyword density 1-2%, proper H1-H3 structure
- **Readability**: 8th-10th grade level for educational audience
- **B2B Focus**: Actionable insights for school administrators

### Performance Metrics
- Organic traffic growth for product categories
- Conversion rate improvements on landing pages
- Search ranking improvements for target keywords
- Content engagement metrics (time on page, shares)

## Implementation Plan

### Phase 1: Setup (Week 1)
1. Clone SEO Machine repository
2. Configure context files for B2B education niche
3. Set up Google Analytics/Search Console integration
4. Install Python dependencies

### Phase 2: Content Audit (Week 2)
1. Analyze existing product pages and blog content
2. Identify content gaps and opportunities
3. Create keyword research database
4. Set up competitor monitoring

### Phase 3: Content Creation (Ongoing)
1. Implement monthly content calendar
2. Create pillar content for product categories
3. Optimize existing pages for better rankings
4. Monitor performance and iterate

## Expected Benefits

### SEO Improvements
- Higher search rankings for educational supply keywords
- Increased organic traffic to product pages
- Better featured snippet opportunities
- Improved technical SEO scores

### Content Efficiency
- Faster content creation with AI assistance
- Consistent brand voice across all content
- Data-driven topic selection
- Automated optimization workflows

### B2B Sales Enablement
- Educational content that attracts school buyers
- Product-focused landing pages with higher conversion
- Content that addresses B2B buyer pain points
- Performance tracking for content ROI

## Integration with Existing Systems

### Supabase Data Integration
- Pull product data for content creation
- Sync pricing information for accuracy
- Import supplier data for comprehensive guides
- Track content performance in analytics

### ALKOR/SoftCarrier Content
- Create content around supplier product updates
- Generate guides for new product categories
- Optimize content for supplier-specific keywords
- Track performance of supplier-focused content

### Dynamic Pricing Content
- Create content explaining pricing strategies
- Generate comparison guides with live pricing
- Optimize for commercial intent keywords
- Monitor conversion impact of pricing content

## Monitoring and Maintenance

### Weekly Tasks
- Review content performance metrics
- Update keyword rankings in context files
- Add new product content opportunities
- Monitor competitor content strategies

### Monthly Tasks
- Full content audit and optimization
- Update context files with new brand guidelines
- Refresh competitor analysis
- Generate content performance reports

### Quarterly Tasks
- Comprehensive SEO strategy review
- Update content calendar based on performance
- Refresh technical SEO implementations
- Plan new content pillars and topic clusters

## Risk Mitigation

### Content Quality Control
- Human review required for all published content
- Brand voice validation before publishing
- Fact-checking for product specifications
- Legal review for B2B claims and guarantees

### Technical Integration
- Test WordPress publishing workflow thoroughly
- Validate analytics data accuracy
- Monitor API rate limits and costs
- Backup content before automated publishing

### SEO Strategy Alignment
- Ensure content supports overall SEO goals
- Balance commercial and informational content
- Monitor for keyword cannibalization
- Track impact on core business metrics

## Success Metrics

### Content Performance
- Organic traffic growth (target: 30% YoY)
- Search ranking improvements for target keywords
- Content engagement rates (time on page, bounce rate)
- Conversion rate improvements on optimized pages

### Business Impact
- Increased B2B inquiry volume from content
- Higher conversion rates on product pages
- Improved customer lifetime value
- Better brand authority in education sector

### Operational Efficiency
- Content creation time reduction (target: 40% faster)
- Consistent publishing schedule maintenance
- Quality score improvements in content audits
- Team productivity gains from automation