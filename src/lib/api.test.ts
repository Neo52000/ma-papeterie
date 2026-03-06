import { authApi, productsApi, ordersApi, ApiError } from './api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ApiError', () => {
  it('devrait formater un message string', () => {
    const error = new ApiError(400, 'Bad Request');
    expect(error.message).toBe('Bad Request');
    expect(error.status).toBe(400);
    expect(error.name).toBe('ApiError');
  });

  it('devrait joindre un tableau de messages', () => {
    const error = new ApiError(422, ['Field required', 'Invalid email']);
    expect(error.message).toBe('Field required, Invalid email');
  });
});

describe('authApi', () => {
  it('login devrait envoyer email et password', async () => {
    const mockResponse = {
      user: { id: '1', email: 'a@b.com', role: 'user' },
      accessToken: 'token',
      refreshToken: 'refresh',
    };
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    const result = await authApi.login({ email: 'a@b.com', password: 'pass' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'pass' }),
      }),
    );
    expect(result.accessToken).toBe('token');
  });

  it('register devrait envoyer les données', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ user: { id: '1' }, accessToken: 't', refreshToken: 'r' }),
    );

    await authApi.register({ email: 'a@b.com', password: 'pass' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('profile devrait envoyer le Bearer token', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ id: '1', email: 'a@b.com', role: 'user' }),
    );

    await authApi.profile('my-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('devrait lever ApiError sur erreur HTTP', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    await expect(
      authApi.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow(ApiError);
  });
});

describe('productsApi', () => {
  it('list devrait construire la query string', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0 }));

    await productsApi.list({ page: 2, category: 'cahiers', search: 'A4' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('category=cahiers');
    expect(url).toContain('search=A4');
  });

  it('list sans params ne devrait pas avoir de query string', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0 }));

    await productsApi.list();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/products$/);
  });

  it('get devrait appeler /products/:id', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'p1', name: 'Cahier' }));

    await productsApi.get('p1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/products/p1'),
      expect.any(Object),
    );
  });
});

describe('ordersApi', () => {
  it('create devrait envoyer le token et les données', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'o1', total: 10 }));

    await ordersApi.create('my-token', {
      items: [{ productId: 'p1', name: 'Cahier', price: 3.5, quantity: 2 }],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('list devrait envoyer le token', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0 }));

    await ordersApi.list('my-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });
});
