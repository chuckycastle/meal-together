"""
SSRF Protection for Recipe URL Import
Validates URLs to prevent Server-Side Request Forgery attacks.
Checks both IPv4 and IPv6 addresses against private ranges.
"""

import ipaddress
import socket
from urllib.parse import urlparse
import validators


# Private IPv4 ranges (RFC 1918, RFC 3927, loopback)
PRIVATE_RANGES_V4 = [
    ipaddress.IPv4Network('127.0.0.0/8'),      # Loopback
    ipaddress.IPv4Network('10.0.0.0/8'),       # Private Class A
    ipaddress.IPv4Network('172.16.0.0/12'),    # Private Class B
    ipaddress.IPv4Network('192.168.0.0/16'),   # Private Class C
    ipaddress.IPv4Network('169.254.0.0/16'),   # Link-local
]

# Private IPv6 ranges (RFC 4193, RFC 4291, loopback, link-local)
PRIVATE_RANGES_V6 = [
    ipaddress.IPv6Network('::1/128'),          # Loopback
    ipaddress.IPv6Network('fc00::/7'),         # Unique Local Addresses
    ipaddress.IPv6Network('fe80::/10'),        # Link-local
]

# Explicitly blocked domains (metadata services, localhost)
BLOCKED_DOMAINS = [
    'localhost',
    'metadata.google.internal',  # GCP metadata service
    '169.254.169.254',           # AWS/Azure metadata service
    'metadata',
    'metadata.azure.com',
]


def is_private_ip(ip_str: str) -> bool:
    """
    Check if an IP address is in a private range.
    Handles both IPv4 and IPv6.

    Args:
        ip_str: IP address as string

    Returns:
        True if IP is private, False if public
    """
    try:
        ip = ipaddress.ip_address(ip_str)

        if isinstance(ip, ipaddress.IPv4Address):
            return any(ip in net for net in PRIVATE_RANGES_V4)
        else:  # IPv6
            return any(ip in net for net in PRIVATE_RANGES_V6)

    except ValueError:
        # Malformed IP address
        return True  # Reject malformed IPs as unsafe


def validate_url_safe(url: str) -> tuple[bool, str]:
    """
    Validate that a URL is safe from SSRF attacks.
    Checks scheme, domain, and resolves ALL IP addresses (v4 and v6).

    Args:
        url: URL to validate

    Returns:
        Tuple of (is_safe: bool, reason: str)
        - (True, "OK") if URL is safe
        - (False, reason) if URL is unsafe with explanation
    """
    # Basic format validation
    if not validators.url(url):
        return False, "Invalid URL format"

    parsed = urlparse(url)

    # Only allow http/https schemes
    if parsed.scheme not in ('http', 'https'):
        return False, f"Scheme '{parsed.scheme}' not allowed (only HTTP/HTTPS)"

    # Check if hostname is in blocked list
    if not parsed.hostname:
        return False, "No hostname in URL"

    hostname_lower = parsed.hostname.lower()
    if hostname_lower in BLOCKED_DOMAINS:
        return False, f"Domain '{parsed.hostname}' is blocked"

    # Resolve hostname to ALL IP addresses (both v4 and v6)
    try:
        # getaddrinfo returns all resolved addresses for both families
        addr_info = socket.getaddrinfo(
            parsed.hostname,
            None,  # port (we don't care)
            socket.AF_UNSPEC,  # Both IPv4 and IPv6
            socket.SOCK_STREAM
        )

        # Check each resolved IP address
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]

            if is_private_ip(ip_str):
                return False, f"Resolves to private IP: {ip_str}"

    except socket.gaierror:
        return False, f"Could not resolve hostname '{parsed.hostname}'"
    except Exception as e:
        return False, f"DNS resolution error: {str(e)}"

    return True, "OK"
