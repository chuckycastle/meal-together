/**
 * Layout Component
 * Main application layout with navigation
 */

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
      {/* Navigation */}
      <nav className="bg-blue-800 dark:bg-blue-900 shadow-lg">
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
                  <select
                    value={activeFamily?.id || ''}
                    onChange={(e) => {
                      const family = families.find(f => f.id === parseInt(e.target.value));
                      setActiveFamily(family || null);
                    }}
                    className="bg-blue-700 text-white border border-blue-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex items-center space-x-3">
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
            </div>
          </div>
        </div>

        {/* Mobile menu - can be enhanced later */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
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
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
