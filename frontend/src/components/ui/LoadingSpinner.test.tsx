/**
 * LoadingSpinner Component Tests
 */

import { describe, it, expect } from 'vitest';
import { simpleRender, screen } from '../../../test/utils';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner', () => {
    simpleRender(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with message', () => {
    simpleRender(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with small size', () => {
    simpleRender(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with medium size', () => {
    simpleRender(<LoadingSpinner size="md" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with large size', () => {
    simpleRender(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    simpleRender(<LoadingSpinner message="Loading" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('role', 'status');
  });
});
