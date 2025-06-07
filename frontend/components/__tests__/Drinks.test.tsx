import { render, screen } from '@testing-library/react';
import DrinksForm from '../Drinks';

// Basic smoke test to ensure the form renders expected fields

describe('DrinksForm', () => {
  it('renders volume and strength inputs', () => {
    render(<DrinksForm />);

    expect(screen.getByLabelText(/Volume \(ml\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Strength \(% ABV\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Drink/i })).toBeInTheDocument();
  });
});
