import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UrlShortenerForm from '@/components/UrlShortenerForm';
import * as useUrlShortenerHook from '@/hooks/useUrlShortener';

vi.mock('@/hooks/useUrlShortener');

const mockShorten = vi.fn();
const mockReset = vi.fn();

const defaultHookReturn: useUrlShortenerHook.UseUrlShortenerReturn = {
  shorten: mockShorten,
  reset: mockReset,
  result: null,
  isLoading: false,
  error: null,
};

describe('UrlShortenerForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useUrlShortenerHook.useUrlShortener).mockReturnValue(
      defaultHookReturn,
    );
  });

  it('renders the URL input and submit button', () => {
    render(<UrlShortenerForm />);
    expect(
      screen.getByPlaceholderText(/paste your long url/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /shorten url/i }),
    ).toBeInTheDocument();
  });

  it('calls shorten with the trimmed URL on submit', async () => {
    const user = userEvent.setup();
    render(<UrlShortenerForm />);

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /shorten url/i }));

    expect(mockShorten).toHaveBeenCalledWith('https://example.com');
  });

  it('disables the button and shows spinner while loading', () => {
    vi.mocked(useUrlShortenerHook.useUrlShortener).mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    });
    render(<UrlShortenerForm />);

    expect(screen.getByText(/shortening/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays an error alert when error is set', () => {
    vi.mocked(useUrlShortenerHook.useUrlShortener).mockReturnValue({
      ...defaultHookReturn,
      error: 'Invalid URL provided',
    });
    render(<UrlShortenerForm />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid URL provided');
  });

  it('renders the ResultCard when a result is returned', () => {
    vi.mocked(useUrlShortenerHook.useUrlShortener).mockReturnValue({
      ...defaultHookReturn,
      result: { shortUrl: 'https://shortn.io/abc' },
    });
    render(<UrlShortenerForm />);

    expect(screen.getByText('https://shortn.io/abc')).toBeInTheDocument();
  });
});
