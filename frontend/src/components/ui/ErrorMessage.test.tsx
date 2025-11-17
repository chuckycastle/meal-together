/**
 * ErrorMessage Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { simpleRender, screen } from '../../../test/utils';
import { ErrorMessage } from './ErrorMessage';
import userEvent from '@testing-library/user-event';

describe('ErrorMessage', () => {
  it('renders error message from string', () => {
    simpleRender(<ErrorMessage error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error message from Error object', () => {
    const error = new Error('Test error');
    simpleRender(<ErrorMessage error={error} />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders error message from ApiError', () => {
    const error = { error: 'API error message' };
    simpleRender(<ErrorMessage error={error} />);
    expect(screen.getByText('API error message')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    simpleRender(<ErrorMessage message="Custom error" />);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('prefers custom message over error prop', () => {
    simpleRender(<ErrorMessage error="Error text" message="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.queryByText('Error text')).not.toBeInTheDocument();
  });

  it('renders default message when no error or message provided', () => {
    simpleRender(<ErrorMessage />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    simpleRender(<ErrorMessage error="Error" onRetry={onRetry} />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    simpleRender(<ErrorMessage error="Error" onRetry={onRetry} />);

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry not provided', () => {
    simpleRender(<ErrorMessage error="Error" />);
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = simpleRender(<ErrorMessage error="Error" className="custom-class" />);
    const errorDiv = container.firstChild;
    expect(errorDiv).toHaveClass('custom-class');
  });

  it('has correct accessibility role', () => {
    simpleRender(<ErrorMessage error="Error" />);
    const errorDiv = screen.getByRole('alert');
    expect(errorDiv).toBeInTheDocument();
  });
});
