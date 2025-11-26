/**
 * Layout Component
 * Main application layout with navigation
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { activeFamily, families, setActiveFamily } = useFamily();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) => {
    const base = "px-3 py-2 rounded-md text-sm font-medium";
    return isActive(path)
      ? `${base} bg-blue-700 text-white`
      : `${base} text-gray-300 hover:bg-blue-600 hover:text-white`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <nav className="bg-blue-800 dark:bg-blue-900 shadow-lg" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-white text-xl font-bold">
                  MealTogether
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:ml-6 md:flex md:space-x-4">
                <Link to="/" className={navLinkClass('/')}>
                  Dashboard
                </Link>
                <Link to="/recipes" className={navLinkClass('/recipes')}>
                  Recipes
                </Link>
                <Link to="/shopping" className={navLinkClass('/shopping')}>
                  Shopping
                </Link>
                <Link to="/timeline" className={navLinkClass('/timeline')}>
                  Timeline
                </Link>
                <Link to="/cooking" className={navLinkClass('/cooking')}>
                  Cooking
                </Link>
                <Link to="/families" className={navLinkClass('/families')}>
                  Families
                </Link>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Family Selector */}
              {families.length > 0 && (
                <div className="relative">
                  <label htmlFor="family-selector" className="sr-only">
                    Select active family
                  </label>
                  <select
                    id="family-selector"
                    value={activeFamily?.id || ''}
                    onChange={(e) => {
                      const family = families.find(f => f.id === parseInt(e.target.value));
                      setActiveFamily(family || null);
                    }}
                    className="bg-blue-700 dark:bg-blue-800 text-white border border-blue-600 dark:border-blue-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select active family"
                  >
                    {families.map(family => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User Menu */}
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  to="/profile"
                  className="text-gray-300 hover:text-white text-sm font-medium"
                >
                  {user?.first_name} {user?.last_name}
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-300 hover:text-white text-sm font-medium"
                >
                  Logout
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                  aria-label="Toggle navigation menu"
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Hamburger icon */}
                  {!isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className={`${navLinkClass('/')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/recipes"
                className={`${navLinkClass('/recipes')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Recipes
              </Link>
              <Link
                to="/shopping"
                className={`${navLinkClass('/shopping')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shopping
              </Link>
              <Link
                to="/timeline"
                className={`${navLinkClass('/timeline')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Timeline
              </Link>
              <Link
                to="/cooking"
                className={`${navLinkClass('/cooking')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cooking
              </Link>
              <Link
                to="/families"
                className={`${navLinkClass('/families')} block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Families
              </Link>
            </div>
            <div className="pt-4 pb-3 border-t border-blue-700">
              <div className="px-2 space-y-1">
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {user?.first_name} {user?.last_name}
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
