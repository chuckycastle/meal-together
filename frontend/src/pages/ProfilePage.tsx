/**
 * Profile Page
 * User profile and settings management
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { Layout } from '../components/layout';
import { LoadingSpinner } from '../components/ui';
import { ProfileForm, ChangePasswordForm } from '../components/profile';
import type { UpdateProfileFormData, ChangePasswordFormData } from '../schemas/profile.schema';
import { apiClient } from '../services/api';

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { families } = useFamily();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'families'>('profile');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpdateProfile = async (data: UpdateProfileFormData) => {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await apiClient.updateProfile(data);
      await refreshUser();
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await apiClient.changePassword(data.current_password, data.new_password);
      setSuccessMessage('Password changed successfully');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to change password');
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading profile..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-700">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300 dark:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300 dark:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Password
            </button>
            <button
              onClick={() => setActiveTab('families')}
              className={`${
                activeTab === 'families'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300 dark:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Families
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Personal Information
              </h2>
              <ProfileForm user={user} onSubmit={handleUpdateProfile} />
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Change Password
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-700 mb-4">
                Update your password to keep your account secure
              </p>
              <ChangePasswordForm onSubmit={handleChangePassword} />
            </div>
          )}

          {activeTab === 'families' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Families
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-700 mb-4">
                You are a member of {families.length} {families.length === 1 ? 'family' : 'families'}
              </p>
              <div className="space-y-3">
                {families.map((family) => (
                  <div
                    key={family.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-700"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{family.name}</h3>
                      {family.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-700">
                          {family.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-700 dark:text-gray-700 mt-1">
                        {family.member_count} {family.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                ))}

                {families.length === 0 && (
                  <p className="text-center text-gray-700 dark:text-gray-700 py-8">
                    You are not a member of any families yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-700 dark:text-gray-700">Account Status</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.is_active ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Inactive
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-700 dark:text-gray-700">Member Since</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 dark:text-gray-700">Last Updated</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(user.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
