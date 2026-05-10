import { render, screen } from '@testing-library/react';
import App from './App';

// Zakladny test z CRA sablony, ponechany ako minimalna kontrola renderovania.
test('renders learn react link', () => {
  // Aplikacia sa renderuje do testovacieho DOMu.
  render(<App />);
  // Tento test by bolo vhodne neskor upravit na realny text aplikacie.
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
