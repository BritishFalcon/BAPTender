import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from '../AuthGate';

const noop = () => {};

describe('AuthGate', () => {
  it('toggles between login and register modes', async () => {
    const user = userEvent.setup();
    render(<AuthGate onLogin={noop} />);

    expect(screen.getByRole('heading', { name: /Access Terminal/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Register here/i }));
    expect(screen.getByRole('heading', { name: /Enlist in BAPTender/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^Log in$/i })[0]);
    expect(screen.getByRole('heading', { name: /Access Terminal/i })).toBeInTheDocument();
  });
});
