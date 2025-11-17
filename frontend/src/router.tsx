/**
 * React Router Configuration
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';

// Placeholder pages - will be implemented in later phases
const LoginPage = () => <div>Login Page (TODO)</div>;
const RegisterPage = () => <div>Register Page (TODO)</div>;
const DashboardPage = () => <div>Dashboard Page (TODO)</div>;
const FamiliesPage = () => <div>Families Page (TODO)</div>;
const RecipesPage = () => <div>Recipes Page (TODO)</div>;
const RecipeDetailPage = () => <div>Recipe Detail Page (TODO)</div>;
const RecipeFormPage = () => <div>Recipe Form Page (TODO)</div>;
const ShoppingPage = () => <div>Shopping Page (TODO)</div>;
const TimelinePage = () => <div>Timeline Page (TODO)</div>;
const CookingModePage = () => <div>Cooking Mode Page (TODO)</div>;
const ProfilePage = () => <div>Profile Page (TODO)</div>;
const NotFoundPage = () => <div>404 - Page Not Found</div>;

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Protected routes (will add ProtectedRoute wrapper in Phase 2)
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/families',
    element: <FamiliesPage />,
  },
  {
    path: '/recipes',
    element: <RecipesPage />,
  },
  {
    path: '/recipes/new',
    element: <RecipeFormPage />,
  },
  {
    path: '/recipes/:id',
    element: <RecipeDetailPage />,
  },
  {
    path: '/recipes/:id/edit',
    element: <RecipeFormPage />,
  },
  {
    path: '/shopping',
    element: <ShoppingPage />,
  },
  {
    path: '/timeline',
    element: <TimelinePage />,
  },
  {
    path: '/cooking',
    element: <CookingModePage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
