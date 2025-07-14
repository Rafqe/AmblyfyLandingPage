import React, { useState } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";
import { sanitizeError, isValidPassword } from "../utils/security";

interface SettingsProps {
  user: User | null;
  profile: any;
  onProfileUpdate: (profile: any) => void;
  onLogout: () => void;
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  user,
  profile,
  onProfileUpdate,
  onLogout,
  darkMode,
  onDarkModeToggle,
}) => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "appearance" | "danger"
  >("profile");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Check if user is a doctor
  const isDoctor = profile?.account_type === "doctor";

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || "",
    surname: profile?.surname || "",
    info: profile?.info || "",
  });

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Input validation
  const validateName = (name: string): boolean => {
    return name.trim().length >= 2 && /^[a-zA-Z\s-']+$/.test(name.trim());
  };

  // Remove weak password validation - use isValidPassword from security utils

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!validateName(profileForm.name)) {
      setStatus("Name must be at least 2 characters and contain only letters.");
      setLoading(false);
      return;
    }

    if (!validateName(profileForm.surname)) {
      setStatus(
        "Surname must be at least 2 characters and contain only letters."
      );
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error("No user");

      // Prepare update data
      const updateData: any = {
        name: profileForm.name.trim(),
        surname: profileForm.surname.trim(),
      };

      // Only include info field if user is a doctor
      if (isDoctor) {
        updateData.info = profileForm.info.trim();
      }

      const { error } = await supabase
        .from("user_data")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      setStatus("Profile updated successfully!");

      // Update parent component
      const updatedProfile = {
        ...profile,
        name: profileForm.name.trim(),
        surname: profileForm.surname.trim(),
        ...(isDoctor && { info: profileForm.info.trim() }),
      };
      onProfileUpdate(updatedProfile);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setStatus("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced password validation
  const validatePasswordStrength = isValidPassword;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!passwordForm.currentPassword) {
      setStatus("Current password is required.");
      setLoading(false);
      return;
    }

    if (!validatePasswordStrength(passwordForm.newPassword)) {
      setStatus(
        "New password must be at least 8 characters and contain at least one number."
      );
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus("New passwords do not match.");
      setLoading(false);
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setStatus("New password must be different from current password.");
      setLoading(false);
      return;
    }

    try {
      // Verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setStatus("Current password is incorrect.");
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setStatus("Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      const safeError = sanitizeError(err);
      setStatus(`Failed to update password: ${safeError}`);
    } finally {
      setLoading(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    const confirmText = "DELETE MY ACCOUNT";
    const userInput = window.prompt(
      `This action cannot be undone. All your data will be permanently deleted.\n\nTo confirm, please type: ${confirmText}`
    );

    if (userInput !== confirmText) {
      setStatus("Account deletion cancelled.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      // Use the server-side function to completely delete the user account
      // This deletes all data AND the auth record
      const { data, error } = await supabase.rpc("delete_user_completely");

      if (error) throw error;

      // Check the response from the function
      if (data && data.success) {
        setStatus(
          "Account completely deleted. You will be signed out in 3 seconds."
        );
        setTimeout(() => {
          onLogout();
        }, 3000);
      } else {
        // Handle function-level errors
        const errorMessage = data?.message || "Unknown error occurred";
        setStatus(`Account deletion failed: ${errorMessage}`);
      }
    } catch (err: any) {
      const safeError = sanitizeError(err);
      setStatus(`Failed to delete account: ${safeError}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "appearance", name: "Appearance", icon: "🎨" },
    { id: "danger", name: "Danger Zone", icon: "⚠️" },
  ];

  return (
    <div className="flex items-center justify-center w-full">
      {/* Main Settings Card */}
      <div
        // Card height now accounts for navbar (64px). Adjust 64px if navbar height changes.
        className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] flex flex-col items-center space-y-6 overflow-auto ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Title and Description inside the card */}
        <div className="text-center mb-4 pt-6 px-6">
          <h1
            className={`text-3xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-brand-dark-blue"
            }`}
          >
            Settings
          </h1>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Manage your account preferences and security
          </p>
        </div>
        {/* Tab Navigation */}
        <div
          className={`flex flex-wrap border-b ${
            darkMode ? "border-gray-600" : "border-gray-200"
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-0 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-dark-blue text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600"
                  : "bg-gray-50 text-gray-600 hover:text-brand-dark-blue hover:bg-gray-100"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-brand-dark-blue"
                }`}
              >
                Profile Information
              </h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="settings-name"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      First Name
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="settings-surname"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Last Name
                    </label>
                    <input
                      id="settings-surname"
                      type="text"
                      value={profileForm.surname}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          surname: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className={`w-full px-4 py-3 border rounded-lg cursor-not-allowed ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-400"
                        : "border-gray-300 bg-gray-50 text-gray-500"
                    }`}
                  />
                  <p
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Email cannot be changed
                  </p>
                </div>

                {/* Professional Info Field - Only for Doctors */}
                {isDoctor && (
                  <div>
                    <label
                      htmlFor="settings-info"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Professional Information
                    </label>
                    <textarea
                      id="settings-info"
                      value={profileForm.info}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, info: e.target.value })
                      }
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors resize-vertical ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300"
                      }`}
                      placeholder="Add your workplace, specialization, credentials, or other professional information..."
                    />
                    <p
                      className={`text-sm mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      This information will be visible to your patients
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform-gpu hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-brand-dark-blue"
                }`}
              >
                Change Password
              </h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label
                    htmlFor="settings-current-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Current Password
                  </label>
                  <input
                    id="settings-current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter your current password"
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-new-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    New Password
                  </label>
                  <input
                    id="settings-new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter your new password"
                  />
                  <p
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Must be at least 8 characters with at least one number
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="settings-confirm-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "border-gray-300"
                    }`}
                    placeholder="Confirm your new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform-gpu hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-brand-dark-blue"
                }`}
              >
                Theme Preferences
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Dark Mode
                  </h3>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Toggle between light and dark theme
                  </p>
                </div>
                <button
                  onClick={onDarkModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? "bg-brand-cyan" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === "danger" && (
            <div className="space-y-6">
              <h2
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-brand-dark-blue"
                }`}
              >
                Danger Zone
              </h2>
              <div
                className={`p-4 border-2 border-dashed border-red-300 rounded-lg ${
                  darkMode ? "bg-red-900/20" : "bg-red-50"
                }`}
              >
                <h3
                  className={`font-semibold text-red-600 ${
                    darkMode ? "text-red-400" : ""
                  }`}
                >
                  Delete Account
                </h3>
                <p
                  className={`text-sm mt-1 mb-4 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              status.includes("successfully")
                ? darkMode
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-green-50 text-green-800 border border-green-200"
                : darkMode
                ? "bg-red-900 text-red-300 border border-red-700"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
