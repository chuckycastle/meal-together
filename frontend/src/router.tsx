/**
 * React Router Configuration
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const KitchenPage = lazy(() => import('./pages/kitchen/KitchenPage'));
const PlanPage = lazy(() => import('./pages/plan/PlanPage'));
const RecipeListPage = lazy(() => import('./pages/recipes/RecipeListPage'));
const RecipeDetailPage = lazy(() => import('./pages/recipes/RecipeDetailPage'));
const RecipeFormPage = lazy(() => import('./pages/recipes/RecipeFormPage'));
const ShoppingListPage = lazy(() => import('./pages/shopping/ShoppingListPage'));
const CookPage = lazy(() => import('./pages/cooking/CookPage'));
const TimerDemoPage = lazy(() => import('./pages/cooking/TimerDemoPage'));
const FamilyManagementPage = lazy(() => import('./pages/families/FamilyManagementPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Loading component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-ink"></div>
  </div>
);

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
            <KitchenPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <PlanPage />
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
        path="/cook/:recipeId"
        element={
          <ProtectedRoute>
            <CookPage />
          </ProtectedRoute>
        }
      />
      {/* The schedule and cooking screens moved into the plan */}
      <Route path="/timeline" element={<Navigate to="/plan" replace />} />
      <Route path="/cooking" element={<Navigate to="/" replace />} />
      <Route
        path="/timer-demo"
        element={
          <ProtectedRoute>
            <TimerDemoPage />
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
