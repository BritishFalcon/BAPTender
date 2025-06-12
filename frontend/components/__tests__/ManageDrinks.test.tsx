import { render, screen, waitFor } from '@testing-library/react';
import ManageDrinks from '../ManageDrinks';
import { PopupProvider } from '../../context/PopupContext';

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: () => 't',
    },
    writable: true,
  });
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  ) as jest.Mock;
});

afterEach(() => {
  (global.fetch as jest.Mock).mockClear();
});

it('renders table headers', async () => {
  render(
    <PopupProvider>
      <ManageDrinks />
    </PopupProvider>
  );
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.getByText('ML')).toBeInTheDocument();
  expect(screen.getByText('%')).toBeInTheDocument();
});
