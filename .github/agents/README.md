# Fullstack B2B E-Commerce Agent

## Overview

This agent specializes in **ma-papeterie**—a B2B stationery e-commerce platform with complex supplier integrations. It combines deep domain knowledge with context-aware reference loading following the claude-skills pattern.

## Quick Start

The agent activates automatically based on your request content:

```
"Debug ALKOR sync issues" → Loads ALKOR sync reference + debugging workflows
"Build B2B pricing feature" → Loads pricing engine + hook patterns
"Create product search hook" → Loads hook patterns + performance optimizations
```

## Architecture

### Core Agent
- **File**: `fullstack-b2b-ecommerce.agent.md`
- **Specialization**: React/TypeScript, Supabase, B2B pricing, supplier sync
- **Personality**: Pragmatic, pattern-focused, cost-aware

### Context-Aware References
Following claude-skills pattern, the agent automatically loads deep references:

| Context | Trigger Keywords | Reference File |
|---------|------------------|---------------|
| ALKOR Sync | "ALKOR", "scraping", "supplier sync", "images" | `references/alkor-sync.md` |
| B2B Pricing | "pricing", "customer grids", "margins", "discounts" | `references/b2b-pricing.md` |
| Hook Patterns | "hook", "useProducts", "data fetching", "real-time" | `references/hooks-patterns.md` |

### Multi-Context Workflows
Complex tasks combine multiple references automatically:
- **Bug Investigation**: ALKOR + Hooks → Debug sync pipeline
- **Feature Development**: Hooks + Pricing → Build pricing features
- **Performance**: All contexts → Optimize data flows

## Domain Expertise

### Technology Stack
- **Frontend**: React 18, TypeScript strict, Vite, shadcn/ui, Tailwind
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: TanStack Query v5, Zustand, custom hooks (48+)
- **Forms**: React Hook Form + Zod validation
- **Sync**: ALKOR scraping, SoftCarrier FTP, GitHub Actions

### Business Domain
- **B2B E-commerce**: Customer types (educational, corporate, bulk)
- **Supplier Integration**: ALKOR (primary), SoftCarrier, Líder Papel
- **Pricing Engine**: Dynamic margins, volume discounts, contract pricing
- **Compliance**: GDPR, data processing registers, cookie consent

## Critical Rules

1. **Type Safety First**: NO `any` types, strict TypeScript + Zod
2. **Follow Patterns**: 48+ hooks follow consistent shapes
3. **Supplier Data Sacred**: Expensive syncs, batch operations, no waste
4. **isMounted Cleanup**: Memory leaks = stale supplier data
5. **Zod = Source of Truth**: Runtime + compile-time validation
6. **Test Real Scenarios**: Pricing with actual customer types
7. **No Spread Operators**: Supplier objects are expensive

## Success Metrics

✅ **TypeScript**: `npm run typecheck` passes, no `@ts-ignore`
✅ **Hook Pattern**: Returns `{ data, loading, error, refetch }`
✅ **Zod Validated**: All input/output validated
✅ **Supplier Sync**: ALKOR products/prices/images consistent
✅ **Performance**: N+1 queries = 0, cache hits > 70%
✅ **B2B Logic**: Pricing matches customer type rules
✅ **Real-time**: Supabase subscriptions active
✅ **Code Quality**: Commits explain "why", patterns followed

## Workflow Commands

### Standard Development Flow
1. **Scope** (5 min): Hook/component? Supplier affected? B2B pricing?
2. **Design** (10 min): Copy pattern, Zod schema first
3. **Implement** (30+ min): Follow patterns, grep for similar code
4. **Validate** (10 min): Test with real data, check database
5. **Real-time** (5 min): Crawl job/import log updated?
6. **Complete** (5 min): Typecheck, cleanup, commit with context

### Bug Investigation Flow
1. **Isolate**: Where does data break? (scrape → import → table → UI)
2. **Check Admin**: Crawl job status, import logs
3. **Query DB**: `SELECT * FROM products WHERE supplier='ALKOR'`
4. **Edge Function**: Supabase logs, timeout/API errors?
5. **Fix & Test**: Apply fix, re-run sync via GitHub Action
6. **Verify Multi**: Doesn't break SOFT/LIDER

## Real-World Examples

### ALKOR Images Not Syncing
**Investigation**: Check AdminAlkor UI → crawl job → database → Edge logs
**Root Cause**: Image URLs expired, rate limiting, RPC batch failure
**Fix**: Retry logic with exponential backoff, download immediately
**Validation**: Crawl completes, images in DB, admin shows images

### B2B Pricing Inconsistency
**Investigation**: Compare grid rules vs calculated prices
**Root Cause**: Cache stale, customer adjustment missing, volume logic wrong
**Fix**: Refresh cache, validate customer lookup, test volume thresholds
**Validation**: All customer types return correct prices

## Testing Strategy

### Unit Tests
- Hook return shapes: `{ data, loading, error, refetch }`
- Pricing calculations: margins, discounts, customer types
- Zod schemas: validation passes/fails correctly

### Integration Tests
- Full sync pipeline: scrape → import → database → UI
- Price engine: supplier cost → final price calculation
- Real-time: Supabase subscriptions trigger updates

### E2E Tests
- Admin sync triggers work
- Product catalog updates appear
- B2B pricing displays correctly per customer type

## Performance Optimizations

### Data Fetching
- TanStack Query: `staleTime: 5 * 60 * 1000` (5 min)
- Cache hierarchies: live_prices table for expensive calculations
- Batch operations: RPC calls for bulk updates

### Supplier Sync
- Rate limiting: 2-3 req/sec, exponential backoff
- Parallel processing: PQueue for concurrent downloads
- Incremental sync: Only changed products since last run

### Real-time Updates
- Supabase subscriptions: Channel-based, filtered by relevance
- Debounced updates: Prevent excessive re-renders
- Optimistic updates: UI updates immediately, rollback on error

## Monitoring & Alerts

### Key Metrics
- **Sync Health**: Success rate > 95%, duration < 30 min
- **Price Accuracy**: Discrepancy alerts, cache hit rate > 80%
- **Performance**: Query latency < 200ms, hook render time < 100ms
- **Data Quality**: Supplier data completeness, image sync rate

### Alert Conditions
- Sync failures, price calculation errors
- Cache miss rate > 20%, memory leaks detected
- Customer complaints about pricing/data

## Contributing

### Adding References
1. Create new `.md` file in `references/` directory
2. Follow existing patterns: overview, architecture, critical patterns, examples
3. Update agent file to reference new context triggers
4. Test automatic loading with relevant keywords

### Improving Agent
- Add new success metrics or critical rules
- Expand workflow examples
- Update domain knowledge as codebase evolves
- Add new activation keywords

## Changelog

### v1.0.0 (March 2026)
- Initial agent with personality and critical rules
- 8 success metrics, detailed workflows
- Context-aware reference loading system
- ALKOR sync, B2B pricing, and hooks pattern references

## License

MIT - Specialized for ma-papeterie B2B e-commerce development

## Credits

**Inspired by**: claude-skills (Jeffallan) — Context-aware agents with deep references
**Domain**: ma-papeterie B2B stationery platform
**Tech Stack**: React/TypeScript, Supabase, complex supplier integrations