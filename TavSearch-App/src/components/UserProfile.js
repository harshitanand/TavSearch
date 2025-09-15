import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Settings,
  BarChart3,
  Download,
  Save,
  Edit,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Since the actual API might not be ready, let's mock the data
      const mockProfile = {
        name: 'Demo User',
        email: 'demo@tavsearch.ai',
        role: 'User',
        subscription: 'Pro',
        createdAt: new Date().toISOString(),
        bio: '',
        emailNotifications: true,
        autoExport: false,
        darkMode: false,
      };

      const mockUsage = {
        totalAnalyses: 42,
        totalExports: 18,
        activeDays: 15,
        apiCalls: 126,
      };

      setProfile(mockProfile);
      setUsage(mockUsage);
      setFormData(mockProfile);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Mock successful save
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProfile(formData);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800">Failed to load profile: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">User Profile</h2>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          {saving ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : editing ? (
            <Save className="h-4 w-4" />
          ) : (
            <Edit className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Edit Profile'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Profile Information */}
      {profile && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {profile.name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {profile.email || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="h-4 w-4 inline mr-1" />
                User Role
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                {profile.role || 'User'}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.subscription || 'Basic'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Member Since
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>

          {editing && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          )}
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Usage Statistics (Last 30 Days)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.totalAnalyses || 0}</p>
              <p className="text-sm text-gray-600">Total Analyses</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.totalExports || 0}</p>
              <p className="text-sm text-gray-600">Exports Downloaded</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.activeDays || 0}</p>
              <p className="text-sm text-gray-600">Active Days</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.apiCalls || 0}</p>
              <p className="text-sm text-gray-600">API Calls</p>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-600">
                Receive notifications about analysis completion
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailNotifications || false}
                onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Auto-Export Results</h4>
              <p className="text-sm text-gray-600">
                Automatically download analysis results as PDF
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoExport || false}
                onChange={(e) => handleInputChange('autoExport', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
