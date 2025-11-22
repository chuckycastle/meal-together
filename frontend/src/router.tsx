/**
 * React Router Configuration
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RecipeListPage = lazy(() => import('./pages/recipes/RecipeListPage'));
const RecipeDetailPage = lazy(() => import('./pages/recipes/RecipeDetailPage'));
const RecipeFormPage = lazy(() => import('./pages/recipes/RecipeFormPage'));
const ShoppingListPage = lazy(() => import('./pages/shopping/ShoppingListPage'));
const TimelineSchedulerPage = lazy(() => import('./pages/timeline/TimelineSchedulerPage'));
const CookingSessionPage = lazy(() => import('./pages/cooking/CookingSessionPage'));
const FamilyManagementPage = lazy(() => import('./pages/families/FamilyManagementPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Placeholder pages
const NotFoundPage = () => <div>404 - Page Not Found</div>;

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/families"
        element={
          <ProtectedRoute>
            <FamilyManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <RecipeListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/new"
        element={
          <ProtectedRoute>
            <RecipeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/:id"
        element={
          <ProtectedRoute>
            <RecipeDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/:id/edit"
        element={
          <ProtectedRoute>
            <RecipeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <ShoppingListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <TimelineSchedulerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cooking"
        element={
          <ProtectedRoute>
            <CookingSessionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
