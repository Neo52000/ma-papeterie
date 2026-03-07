# B2B Pricing Engine Reference

## Overview
ma-papeterie implements a complex B2B pricing system with customer-specific grids, volume discounts, and dynamic pricing based on supplier costs and margins.

## Architecture

### Core Tables
```sql
-- Customer types and their pricing grids
b2b_price_grids (
  id UUID PRIMARY KEY,
  customer_type VARCHAR, -- 'educational', 'corporate', 'bulk'
  supplier VARCHAR, -- 'ALKOR', 'SOFT', 'LIDER'
  category VARCHAR,
  min_quantity INTEGER,
  max_quantity INTEGER,
  margin_percentage DECIMAL,
  fixed_markup DECIMAL,
  created_at TIMESTAMP
)

-- Customer accounts with pricing overrides
b2b_accounts (
  id UUID PRIMARY KEY,
  customer_id UUID,
  pricing_grid_id UUID REFERENCES b2b_price_grids(id),
  custom_margin DECIMAL, -- Override default margin
  volume_discount DECIMAL,
  contract_start DATE,
  contract_end DATE
)

-- Live price calculations cache
live_prices (
  product_id UUID PRIMARY KEY,
  supplier VARCHAR,
  supplier_cost DECIMAL,
  calculated_price DECIMAL,
  margin_applied DECIMAL,
  customer_type VARCHAR,
  last_updated TIMESTAMP
)
```

### Pricing Calculation Flow
```
Supplier Cost → Base Margin → Customer Type Adjustment → Volume Discount → Final Price
```

## Critical Patterns

### 1. Price Calculation Engine
```typescript
// lib/pricing-engine.ts
interface PricingContext {
  productId: string
  supplier: string
  customerType: 'educational' | 'corporate' | 'bulk'
  quantity: number
  customerId?: string
}

interface PricingResult {
  basePrice: number
  finalPrice: number
  margin: number
  discount: number
  breakdown: {
    supplierCost: number
    baseMargin: number
    customerAdjustment: number
    volumeDiscount: number
  }
}

export class PricingEngine {
  async calculatePrice(context: PricingContext): Promise<PricingResult> {
    // Get supplier cost
    const supplierCost = await this.getSupplierCost(context.productId, context.supplier)

    // Get base pricing grid
    const grid = await this.getPricingGrid(context.supplier, context.customerType)

    // Calculate base price with margin
    const baseMargin = grid.margin_percentage / 100
    const basePrice = supplierCost * (1 + baseMargin)

    // Apply customer-specific adjustments
    const customerAdjustment = await this.getCustomerAdjustment(context.customerId, grid)

    // Apply volume discount
    const volumeDiscount = this.calculateVolumeDiscount(context.quantity, grid)

    // Calculate final price
    const adjustedPrice = basePrice * customerAdjustment
    const finalPrice = adjustedPrice * (1 - volumeDiscount)

    return {
      basePrice,
      finalPrice,
      margin: baseMargin,
      discount: volumeDiscount,
      breakdown: {
        supplierCost,
        baseMargin,
        customerAdjustment,
        volumeDiscount
      }
    }
  }

  private async getSupplierCost(productId: string, supplier: string): Promise<number> {
    const { data } = await supabase
      .from('supplier_offers')
      .select('price')
      .eq('product_id', productId)
      .eq('supplier', supplier)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return data?.price || 0
  }

  private async getPricingGrid(supplier: string, customerType: string) {
    const { data } = await supabase
      .from('b2b_price_grids')
      .select('*')
      .eq('supplier', supplier)
      .eq('customer_type', customerType)
      .order('min_quantity', { ascending: true })
      .limit(1)
      .single()

    return data
  }

  private async getCustomerAdjustment(customerId: string | undefined, grid: any): Promise<number> {
    if (!customerId) return 1

    const { data: account } = await supabase
      .from('b2b_accounts')
      .select('custom_margin')
      .eq('customer_id', customerId)
      .single()

    if (account?.custom_margin) {
      return account.custom_margin / 100
    }

    return 1
  }

  private calculateVolumeDiscount(quantity: number, grid: any): number {
    if (quantity >= grid.min_quantity && quantity <= grid.max_quantity) {
      return grid.volume_discount || 0
    }
    return 0
  }
}
```

### 2. Live Price Hook Pattern
```typescript
// hooks/useLivePrice.ts
export const useLivePrice = (productId: string, customerType: string, quantity: number = 1) => {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true)

        // Check cache first
        const { data: cached } = await supabase
          .from('live_prices')
          .select('calculated_price, last_updated')
          .eq('product_id', productId)
          .eq('customer_type', customerType)
          .single()

        // Use cache if less than 1 hour old
        if (cached && Date.now() - new Date(cached.last_updated).getTime() < 3600000) {
          setPrice(cached.calculated_price)
          setLoading(false)
          return
        }

        // Calculate fresh price
        const engine = new PricingEngine()
        const result = await engine.calculatePrice({
          productId,
          supplier: await getProductSupplier(productId),
          customerType,
          quantity
        })

        // Update cache
        await supabase
          .from('live_prices')
          .upsert({
            product_id: productId,
            customer_type: customerType,
            calculated_price: result.finalPrice,
            last_updated: new Date()
          })

        setPrice(result.finalPrice)

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
  }, [productId, customerType, quantity])

  return { price, loading, error, refetch: () => setPrice(null) }
}
```

### 3. Price Comparison Hook
```typescript
// hooks/usePriceComparison.ts
export const usePriceComparison = (productId: string) => {
  const [comparison, setComparison] = useState<{
    educational: number
    corporate: number
    bulk: number
    savings: {
      corporate: number
      bulk: number
    }
  } | null>(null)

  useEffect(() => {
    const fetchComparison = async () => {
      const engine = new PricingEngine()
      const supplier = await getProductSupplier(productId)

      const [eduPrice, corpPrice, bulkPrice] = await Promise.all([
        engine.calculatePrice({ productId, supplier, customerType: 'educational' }),
        engine.calculatePrice({ productId, supplier, customerType: 'corporate' }),
        engine.calculatePrice({ productId, supplier, customerType: 'bulk' })
      ])

      setComparison({
        educational: eduPrice.finalPrice,
        corporate: corpPrice.finalPrice,
        bulk: bulkPrice.finalPrice,
        savings: {
          corporate: ((eduPrice.finalPrice - corpPrice.finalPrice) / eduPrice.finalPrice) * 100,
          bulk: ((eduPrice.finalPrice - bulkPrice.finalPrice) / eduPrice.finalPrice) * 100
        }
      })
    }

    fetchComparison()
  }, [productId])

  return comparison
}
```

## Business Rules

### Customer Types
1. **Educational**: Schools, universities - highest margins, volume discounts
2. **Corporate**: Businesses, organizations - standard margins, contract pricing
3. **Bulk**: Large quantity buyers - lowest margins, highest volume discounts

### Margin Structure
- **Base Margin**: 25-35% depending on supplier and category
- **Educational Premium**: +5-10% for schools
- **Volume Discounts**: 5-15% for quantities > 100 units
- **Contract Overrides**: Custom margins for enterprise customers

### Price Update Triggers
- Supplier cost changes
- Grid updates
- Customer contract changes
- Manual price refreshes

## Performance Optimizations

### 1. Price Caching Strategy
```typescript
// Cache prices for 1 hour, refresh on demand
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// Background refresh for high-traffic products
const refreshHighTrafficPrices = async () => {
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .order('view_count', { ascending: false })
    .limit(100)

  for (const product of products) {
    await supabase.functions.invoke('refresh-price-cache', {
      body: { productId: product.id }
    })
  }
}
```

### 2. Batch Price Calculations
```typescript
// Calculate prices for cart/checkout in batch
export const calculateCartPrices = async (cart: CartItem[], customerType: string) => {
  const engine = new PricingEngine()

  const pricePromises = cart.map(async (item) => {
    const supplier = await getProductSupplier(item.productId)
    const result = await engine.calculatePrice({
      productId: item.productId,
      supplier,
      customerType,
      quantity: item.quantity
    })
    return {
      productId: item.productId,
      unitPrice: result.finalPrice,
      totalPrice: result.finalPrice * item.quantity,
      breakdown: result.breakdown
    }
  })

  return Promise.all(pricePromises)
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('PricingEngine', () => {
  test('educational pricing applies correct margin', async () => {
    const engine = new PricingEngine()
    const result = await engine.calculatePrice({
      productId: 'test-123',
      supplier: 'ALKOR',
      customerType: 'educational',
      quantity: 1
    })

    expect(result.margin).toBeGreaterThan(0.25) // 25% minimum
    expect(result.finalPrice).toBeGreaterThan(result.breakdown.supplierCost)
  })

  test('bulk pricing applies volume discount', async () => {
    const result = await engine.calculatePrice({
      productId: 'test-123',
      supplier: 'ALKOR',
      customerType: 'bulk',
      quantity: 500
    })

    expect(result.discount).toBeGreaterThan(0)
    expect(result.finalPrice).toBeLessThan(result.basePrice)
  })
})
```

### Integration Tests
- End-to-end price calculation workflows
- Cache invalidation scenarios
- Multi-supplier price comparisons

## Monitoring & Alerts

### Key Metrics
- Price calculation latency (< 200ms)
- Cache hit rate (> 80%)
- Price discrepancy alerts (supplier cost changes)
- Customer-specific pricing accuracy

### Alert Conditions
- Price calculation failures
- Cache miss rate > 20%
- Supplier cost updates without price recalculation
- Customer complaints about pricing