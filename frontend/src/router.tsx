/**
 * React Router Configuration
 */

import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Placeholder pages - will be implemented in later phases
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

export const AppRoutes = () => {
  return (
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
            <FamiliesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <RecipesPage />
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
            <ShoppingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <TimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cooking"
        element={
          <ProtectedRoute>
            <CookingModePage />
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
  );
};
