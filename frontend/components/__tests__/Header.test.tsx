import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../hooks/useWindowWidth', () => () => 400);
jest.mock('../Groups', () => () => <div data-testid="groups" />);
jest.mock('../Account', () => () => <div data-testid="account" />);

import Header from '../Header';

describe('Header', () => {
  it('calls theme toggle when logo is clicked', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<Header onThemeToggle={onToggle} currentThemeName="theme-light" />);

    await user.click(screen.getByText(/BAPTENDER/i));
    expect(onToggle).toHaveBeenCalled();
  });
});
