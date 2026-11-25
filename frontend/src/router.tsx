/**
 * React Router Configuration
 */

import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

const RELOAD_KEY = 'reloaded-for-missing-page';

/**
 * Lazy load a page. After a deploy, an open tab still names the previous
 * build's files; when one is gone, reload once to pick up the new build.
 */
function lazyPage<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const page = await load();
      sessionStorage.removeItem(RELOAD_KEY);
      return page;
    } catch (error) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        // Keep the loading state on screen until the reload happens
        return new Promise<{ default: T }>(() => undefined);
      }
      throw error;
    }
  });
}

// Lazy load all pages for code splitting
const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'));
const KitchenPage = lazyPage(() => import('./pages/kitchen/KitchenPage'));
const PlanPage = lazyPage(() => import('./pages/plan/PlanPage'));
const RecipeListPage = lazyPage(() => import('./pages/recipes/RecipeListPage'));
const RecipeDetailPage = lazyPage(() => import('./pages/recipes/RecipeDetailPage'));
const RecipeFormPage = lazyPage(() => import('./pages/recipes/RecipeFormPage'));
const ShoppingListPage = lazyPage(() => import('./pages/shopping/ShoppingListPage'));
const CookPage = lazyPage(() => import('./pages/cooking/CookPage'));
const TvPage = lazyPage(() => import('./pages/tv/TvPage'));
const TimerDemoPage = lazyPage(() => import('./pages/cooking/TimerDemoPage'));
const FamilyManagementPage = lazyPage(() => import('./pages/families/FamilyManagementPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFound'));

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
        path="/tv"
        element={
          <ProtectedRoute>
            <TvPage />
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
