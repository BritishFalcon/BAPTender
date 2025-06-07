import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

const noop = () => {};

describe('LoginForm', () => {
  it('allows typing into email and password fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={noop} />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'secret');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('secret');
  });
});
