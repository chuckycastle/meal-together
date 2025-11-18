/**
 * Family Management Page
 * Manage family members, settings, and create new families
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { Layout } from '../../components/layout';
import { LoadingSpinner, ErrorMessage } from '../../components/ui';
import { MemberCard, CreateFamilyForm, AddMemberForm } from '../../components/families';
import {
  useFamily as useFamilyQuery,
  useCreateFamily,
  useUpdateFamily,
  useAddMember,
  useRemoveMember,
  useLeaveFamily,
} from '../../hooks/useFamilies';

export const FamilyManagementPage = () => {
  const { user } = useAuth();
  const { activeFamily, setActiveFamily, families } = useFamily();
  const navigate = useNavigate();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const [familyName, setFamilyName] = useState(activeFamily?.name || '');
  const [familyDescription, setFamilyDescription] = useState(activeFamily?.description || '');

  const { data: familyDetails, isLoading, error } = useFamilyQuery(activeFamily?.id);
  const createFamily = useCreateFamily();
  const updateFamily = useUpdateFamily(activeFamily?.id || 0);
  const addMember = useAddMember(activeFamily?.id || 0);
  const removeMember = useRemoveMember(activeFamily?.id || 0);
  const leaveFamily = useLeaveFamily();

  const currentMember = familyDetails?.members?.find((m) => m.user_id === user?.id);
  const currentUserRole = currentMember?.role || '';

  const handleCreateFamily = async (data: { name: string; description?: string }) => {
    try {
      const newFamily = await createFamily.mutateAsync(data);
      setActiveFamily(newFamily);
      setShowCreateForm(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to create family:', err);
    }
  };

  const handleUpdateFamily = async () => {
    if (!activeFamily) return;

    try {
      await updateFamily.mutateAsync({
        name: familyName,
        description: familyDescription,
      });
      setEditingFamily(false);
    } catch (err) {
      console.error('Failed to update family:', err);
    }
  };

  const handleAddMember = async (email: string) => {
    try {
      await addMember.mutateAsync({ email });
      setShowAddMember(false);
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleLeaveFamily = async () => {
    if (!activeFamily) return;
    if (!confirm('Are you sure you want to leave this family?')) return;

    try {
      await leaveFamily.mutateAsync(activeFamily.id);

      // Switch to another family if available
      const remainingFamilies = families.filter((f) => f.id !== activeFamily.id);
      if (remainingFamilies.length > 0) {
        setActiveFamily(remainingFamilies[0]);
      } else {
        setActiveFamily(null);
      }

      navigate('/');
    } catch (err) {
      console.error('Failed to leave family:', err);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading family..." />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <ErrorMessage error={error as Error} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Family Management</h1>
            <p className="mt-2 text-gray-800 dark:text-gray-300">
              Manage your family members and settings
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Create New Family
          </button>
        </div>

        {/* Create Family Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Create New Family
              </h2>
              <CreateFamilyForm
                onSubmit={handleCreateFamily}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        )}

        {!activeFamily ? (
          <div className="text-center py-12">
            <p className="text-gray-800 dark:text-gray-300">
              No family selected. Create or select a family to continue.
            </p>
          </div>
        ) : (
          <>
            {/* Family Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {editingFamily ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                          Family Name
                        </label>
                        <input
                          type="text"
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={familyDescription}
                          onChange={(e) => setFamilyDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateFamily}
                          disabled={updateFamily.isPending}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {updateFamily.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingFamily(false);
                            setFamilyName(activeFamily.name);
                            setFamilyDescription(activeFamily.description || '');
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {activeFamily.name}
                      </h2>
                      {activeFamily.description && (
                        <p className="mt-2 text-gray-800 dark:text-gray-300">
                          {activeFamily.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                        {familyDetails?.member_count || 0} members
                      </p>
                    </>
                  )}
                </div>
                {!editingFamily && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <button
                    onClick={() => setEditingFamily(true)}
                    className="p-2 text-gray-800 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Edit family details"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Members Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3>
                {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Add Member
                  </button>
                )}
              </div>

              {showAddMember && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <AddMemberForm
                    onSubmit={handleAddMember}
                    onCancel={() => setShowAddMember(false)}
                  />
                </div>
              )}

              <div className="space-y-3">
                {familyDetails?.members?.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserRole={currentUserRole}
                    currentUserId={user?.id || 0}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                Danger Zone
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Leave Family</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-300">
                    You will lose access to all family recipes and data
                  </p>
                </div>
                <button
                  onClick={handleLeaveFamily}
                  disabled={leaveFamily.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {leaveFamily.isPending ? 'Leaving...' : 'Leave Family'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default FamilyManagementPage;
