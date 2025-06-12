import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DrinkTabs from '../DrinkTabs';

// Mock the components that are being tabbed to isolate the test
jest.mock('../Drinks', () => () => <div data-testid="log" />);
jest.mock('../ManageDrinks', () => () => <div data-testid="drinks" />);

describe('DrinkTabs', () => {
  it('should display the "Add Drink" tab by default and switch to the "Manage" tab on click', async () => {
    const user = userEvent.setup();
    render(<DrinkTabs />);

    // 1. Check the initial state: "Log Drink" content should be visible.
    expect(screen.getByTestId('log')).toBeInTheDocument();
    expect(screen.queryByTestId('drinks')).not.toBeInTheDocument();

    // 2. Simulate the user clicking on the "Drinks" tab button.
    await user.click(screen.getByRole('button', { name: /Manage/i }));

    // 3. Check the new state: "Drinks" content should now be visible, and "Log Drink" should be gone.
    expect(screen.getByTestId('drinks')).toBeInTheDocument();
    expect(screen.queryByTestId('log')).not.toBeInTheDocument();
  });
});
