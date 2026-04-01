import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from './CartContext';
import { useMainCartStore } from '@/stores/mainCartStore';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  track: vi.fn(),
}));

const mockItem = {
  id: 'item-1',
  name: 'Cahier A4',
  price: '3.50',
  image: '/img.jpg',
  category: 'cahiers',
  stock_quantity: 10,
};

function TestConsumer() {
  const { state, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

  return (
    <div>
      <span data-testid="total">{state.total}</span>
      <span data-testid="count">{state.itemCount}</span>
      <span data-testid="items">{JSON.stringify(state.items)}</span>
      <button data-testid="add" onClick={() => addToCart(mockItem)}>Add</button>
      <button data-testid="remove" onClick={() => removeFromCart('item-1')}>Remove</button>
      <button data-testid="update" onClick={() => updateQuantity('item-1', 5)}>Update</button>
      <button data-testid="clear" onClick={() => clearCart()}>Clear</button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <TestConsumer />
    </CartProvider>,
  );
}

describe('CartContext (Zustand bridge)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the Zustand store between tests
    useMainCartStore.setState({ items: [], total: 0, itemCount: 0 });
  });

  it('devrait commencer avec un panier vide', () => {
    renderCart();

    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('devrait ajouter un article au panier', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByTestId('add'));

    expect(screen.getByTestId('total')).toHaveTextContent('3.5');
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('devrait incrémenter la quantité si article déjà présent', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByTestId('add'));
    await user.click(screen.getByTestId('add'));

    expect(screen.getByTestId('total')).toHaveTextContent('7');
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('devrait retirer un article du panier', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByTestId('add'));
    await user.click(screen.getByTestId('remove'));

    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('devrait mettre à jour la quantité', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByTestId('add'));
    await user.click(screen.getByTestId('update'));

    expect(screen.getByTestId('total')).toHaveTextContent('17.5');
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });

  it('devrait vider le panier', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByTestId('add'));
    await user.click(screen.getByTestId('clear'));

    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('devrait gérer les prix NaN gracieusement', async () => {
    const user = userEvent.setup();

    const BadConsumer = () => {
      const { state, addToCart } = useCart();
      return (
        <div>
          <span data-testid="total">{state.total}</span>
          <button
            data-testid="add-bad"
            onClick={() =>
              addToCart({ ...mockItem, id: 'bad', price: 'abc' })
            }
          >
            Add bad
          </button>
        </div>
      );
    };

    render(
      <CartProvider>
        <BadConsumer />
      </CartProvider>,
    );

    await user.click(screen.getByTestId('add-bad'));

    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });
});
