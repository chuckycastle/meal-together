"""
HTTP Fetcher with SSRF Protection and Manual Redirect Handling
Safely fetches HTML content from external URLs with complete security validation.
"""

import os
import requests
from urllib.parse import urljoin, urlparse
from .url_validator import validate_url_safe


# Configuration from environment
MAX_SIZE = int(os.getenv('RECIPE_IMPORT_MAX_SIZE_BYTES', 5242880))  # 5MB default
TIMEOUT = int(os.getenv('RECIPE_IMPORT_TIMEOUT_SECONDS', 10))
MAX_REDIRECTS = int(os.getenv('RECIPE_IMPORT_MAX_REDIRECTS', 3))

USER_AGENT = 'Mozilla/5.0 (compatible; MealTogether/1.0; +https://mealtogether.chuckycastle.io)'


def fetch_html(url: str) -> str:
    """
    Fetch HTML content from URL with complete SSRF protection.
    Handles redirects manually to re-validate each hop.

    Args:
        url: URL to fetch

    Returns:
        HTML content as string

    Raises:
        ValueError: If URL is unsafe, unreachable, or invalid
    """
    # Initial URL validation
    is_safe, reason = validate_url_safe(url)
    if not is_safe:
        raise ValueError(f"Unsafe URL: {reason}")

    current_url = url
    redirect_count = 0

    while redirect_count <= MAX_REDIRECTS:
        # Fetch without auto-redirect (manual redirect handling for security)
        try:
            response = requests.get(
                current_url,
                timeout=TIMEOUT,
                allow_redirects=False,  # Manual redirect handling
                headers={'User-Agent': USER_AGENT},
                stream=True  # Stream to enforce size limit
            )
        except requests.exceptions.Timeout:
            raise ValueError(f"Request timeout after {TIMEOUT}s")
        except requests.exceptions.ConnectionError:
            raise ValueError(f"Could not connect to {urlparse(current_url).hostname}")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"HTTP request failed: {str(e)}")

        # Handle redirects manually
        if response.status_code in (301, 302, 303, 307, 308):
            redirect_count += 1

            if redirect_count > MAX_REDIRECTS:
                raise ValueError(f"Too many redirects (max {MAX_REDIRECTS})")

            location = response.headers.get('Location')
            if not location:
                raise ValueError(f"HTTP {response.status_code} redirect without Location header")

            # Resolve relative redirects to absolute URL
            next_url = urljoin(current_url, location)

            # RE-VALIDATE after redirect (critical for SSRF protection)
            # Prevents redirect from safe domain to private IP
            is_safe, reason = validate_url_safe(next_url)
            if not is_safe:
                raise ValueError(f"Redirect to unsafe URL: {reason}")

            current_url = next_url
            continue  # Follow redirect

        # Check HTTP status code
        if not (200 <= response.status_code < 300):
            raise ValueError(f"HTTP {response.status_code} error")

        # Check Content-Type header (must be HTML)
        content_type = response.headers.get('content-type', '').lower()
        if 'html' not in content_type and 'text' not in content_type:
            raise ValueError(f"Not HTML content: {content_type}")

        # Read response with size limit enforcement
        content = b''
        try:
            for chunk in response.iter_content(chunk_size=8192):
                content += chunk
                if len(content) > MAX_SIZE:
                    raise ValueError(f"Response too large (max {MAX_SIZE} bytes)")
        except requests.exceptions.ChunkedEncodingError:
            raise ValueError("Connection interrupted while reading response")

        # Decode to UTF-8 (ignore errors for resilience)
        try:
            return content.decode('utf-8', errors='ignore')
        except Exception as e:
            raise ValueError(f"Failed to decode content: {str(e)}")

    # Should never reach here due to loop condition, but just in case
    raise ValueError("Failed to fetch content after redirects")
