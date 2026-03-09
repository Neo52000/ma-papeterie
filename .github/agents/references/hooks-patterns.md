# Custom Hooks Patterns Reference

## Overview
ma-papeterie uses 48+ custom hooks following strict patterns for data fetching, state management, and side effects. All hooks follow the TanStack Query pattern with consistent return shapes.

## Core Patterns

### 1. Data Fetching Hook Pattern
```typescript
// Standard return shape for all data hooks
interface DataHookReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Implementation pattern
export const useProducts = (filters?: ProductFilters): DataHookReturn<Product[]> => {
  const [data, setData] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: result, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .match(filters || {})

      if (fetchError) throw fetchError

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
```

### 2. Real-time Subscription Pattern
```typescript
// Pattern for hooks that need real-time updates
export const useProductsRealtime = (filters?: ProductFilters) => {
  const { data, loading, error, refetch } = useProducts(filters)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    // Subscribe to product changes
    const subscription = supabase
      .channel('products-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: filters ? `category=eq.${filters.category}` : undefined
        },
        (payload) => {
          if (isMounted.current) {
            console.log('Product change:', payload)
            refetch() // Refresh data on changes
          }
        }
      )
      .subscribe()

    return () => {
      isMounted.current = false
      subscription.unsubscribe()
    }
  }, [filters, refetch])

  return { data, loading, error, refetch }
}
```

### 3. Mutation Hook Pattern
```typescript
// Pattern for create/update/delete operations
interface MutationHookReturn<T, V> {
  mutate: (variables: V) => Promise<T>
  loading: boolean
  error: string | null
  reset: () => void
}

export const useCreateProduct = (): MutationHookReturn<Product, CreateProductInput> => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (input: CreateProductInput) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: mutationError } = await supabase
        .from('products')
        .insert(input)
        .select()
        .single()

      if (mutationError) throw mutationError

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mutation failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { mutate, loading, error, reset }
}
```

### 4. Form Hook Pattern
```typescript
// Pattern for form state management with validation
export const useProductForm = (initialData?: Partial<Product>) => {
  const [formData, setFormData] = useState<CreateProductInput>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    price: initialData?.price || 0,
    category: initialData?.category || '',
    ...initialData
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CreateProductInput, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof CreateProductInput, boolean>>>({})

  // Zod schema for validation
  const productSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    sku: z.string().min(1, 'SKU is required'),
    price: z.number().positive('Price must be positive'),
    category: z.string().min(1, 'Category is required')
  })

  const validate = useCallback(() => {
    try {
      productSchema.parse(formData)
      setErrors({})
      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach(error => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message
          }
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }, [formData])

  const setFieldValue = useCallback((field: keyof CreateProductInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      validate()
    }
  }, [touched, validate])

  const setFieldTouched = useCallback((field: keyof CreateProductInput) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  const reset = useCallback(() => {
    setFormData(initialData || {
      name: '',
      sku: '',
      price: 0,
      category: ''
    })
    setErrors({})
    setTouched({})
  }, [initialData])

  return {
    formData,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0
  }
}
```

### 5. B2B-Specific Hook Patterns

#### Account Management
```typescript
export const useB2BAccount = (customerId: string) => {
  const { data: account, loading, error, refetch } = useQuery({
    queryKey: ['b2b-account', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_accounts')
        .select(`
          *,
          pricing_grid:b2b_price_grids(*),
          orders:orders(count),
          invoices:invoices(sum(amount))
        `)
        .eq('customer_id', customerId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  return { account, loading, error, refetch }
}
```

#### Budget Tracking
```typescript
export const useB2BBudget = (accountId: string) => {
  const { data: budget, loading, error } = useQuery({
    queryKey: ['b2b-budget', accountId],
    queryFn: async () => {
      // Calculate budget usage from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('account_id', accountId)
        .eq('status', 'completed')
        .gte('created_at', '2024-01-01')

      const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      const { data: account } = await supabase
        .from('b2b_accounts')
        .select('budget_limit')
        .eq('id', accountId)
        .single()

      return {
        spent: totalSpent,
        limit: account?.budget_limit || 0,
        remaining: (account?.budget_limit || 0) - totalSpent,
        utilization: totalSpent / (account?.budget_limit || 1) * 100
      }
    },
    refetchInterval: 30 * 1000 // Refresh every 30 seconds
  })

  return { budget, loading, error }
}
```

## Error Handling Patterns

### 1. Consistent Error States
```typescript
// All hooks follow this error pattern
const [error, setError] = useState<string | null>(null)

// Error setting pattern
catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error'
  setError(errorMessage)
  console.error('Hook error:', err)
}
```

### 2. Error Recovery
```typescript
const refetch = useCallback(async () => {
  try {
    setError(null) // Clear previous errors
    // ... fetch logic
  } catch (err) {
    // ... error handling
  }
}, [])
```

## Performance Patterns

### 1. Debounced Search
```typescript
export const useProductSearch = (query: string, debounceMs: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return useProducts({ search: debouncedQuery })
}
```

### 2. Infinite Scroll
```typescript
export const useInfiniteProducts = (filters?: ProductFilters) => {
  const [page, setPage] = useState(1)
  const [allData, setAllData] = useState<Product[]>([])
  const [hasMore, setHasMore] = useState(true)

  const { data, loading, error } = useQuery({
    queryKey: ['products-infinite', filters, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .match(filters || {})
        .range(from, to)

      if (error) throw error

      if (data.length < PAGE_SIZE) {
        setHasMore(false)
      }

      return data
    }
  })

  useEffect(() => {
    if (data) {
      setAllData(prev => page === 1 ? data : [...prev, ...data])
    }
  }, [data, page])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
    }
  }, [loading, hasMore])

  return { data: allData, loading, error, hasMore, loadMore }
}
```

## Testing Patterns

### 1. Hook Testing
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProducts', () => {
  test('returns products data', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.error).toBeNull()
  })
})
```

### 2. Mocking Supabase
```typescript
import { vi, Mock } from 'vitest'

vi.mock('../integrations/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 1, name: 'Test Product' },
            error: null
          }))
        }))
      }))
    }))
  }
}))
```

## Hook Categories in Codebase

### Data Fetching (25+ hooks)
- `useProducts`, `useCategories`, `useOrders`
- `useB2BAccount`, `useB2BBudget`, `useB2BInvoices`
- `useSupplierOffers`, `useProductSuppliers`

### Real-time (8+ hooks)
- `useProductsRealtime`, `useOrdersRealtime`
- `useCrawlJobs`, `useImportLogs`

### Mutations (10+ hooks)
- `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`
- `useCreateOrder`, `useUpdateOrder`

### UI State (5+ hooks)
- `useMobile`, `useToast`, `useCookieConsent`
- `useCart`, `useWishlist`

### Analytics (3+ hooks)
- `useAnalytics`, `useAnalyticsKPIs`
- `useSalesPredictions`, `usePriceEvolution`