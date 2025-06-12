import { render, screen } from '@testing-library/react';
import RegisterForm from '../RegisterForm';

const noop = () => {};

describe('RegisterForm', () => {
  it('renders confirm password field', () => {
    render(<RegisterForm onLogin={noop} />);
    expect(screen.getByPlaceholderText(/Confirm Password/i)).toBeInTheDocument();
  });
});
