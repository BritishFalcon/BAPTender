import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DrinkTabs from '../DrinkTabs';
jest.mock('../Drinks', () => () => <div data-testid="log" />);
jest.mock('../ManageDrinks', () => () => <div data-testid="drinks" />);

describe('DrinkTabs', () => {
  it('switches tabs', async () => {
    const user = userEvent.setup();
    render(<DrinkTabs />);
    expect(screen.getByTestId('log')).toBeInTheDocument();
    expect(await screen.findByTestId('drinks')).toBeInTheDocument();
    await user.click(screen.getByText('Drinks'));
    await screen.findByTestId('drinks'); // Explicitly wait for the DOM update
    
    expect(screen.getByTestId('drinks')).toBeInTheDocument();
  });
});
