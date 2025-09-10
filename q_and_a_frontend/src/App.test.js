import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ask the agent title', () => {
  render(<App />);
  const title = screen.getByText(/Ask the agent/i);
  expect(title).toBeInTheDocument();
});
