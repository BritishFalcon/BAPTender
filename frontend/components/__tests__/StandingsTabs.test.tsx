import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StandingsTabs from '../StandingsTabs';

jest.mock('../Table', () => () => <div data-testid="table" />);
jest.mock('../ManageDrinks', () => () => <div data-testid="drinks" />);

describe('StandingsTabs', () => {
  it('switches tabs', async () => {
    const user = userEvent.setup();
    render(<StandingsTabs />);
    expect(screen.getByTestId('table')).toBeInTheDocument();
    await user.click(screen.getByText('Drinks'));
    expect(screen.getByTestId('drinks')).toBeInTheDocument();
  });
});
