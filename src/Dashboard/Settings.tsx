import React, { useState } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

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

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || "",
    surname: profile?.surname || "",
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

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

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

      const { error } = await supabase
        .from("user_data")
        .update({
          name: profileForm.name.trim(),
          surname: profileForm.surname.trim(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setStatus("Profile updated successfully!");

      // Update parent component
      const updatedProfile = {
        ...profile,
        name: profileForm.name.trim(),
        surname: profileForm.surname.trim(),
      };
      onProfileUpdate(updatedProfile);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setStatus("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!validatePassword(passwordForm.newPassword)) {
      setStatus("New password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus("New passwords do not match.");
      setLoading(false);
      return;
    }

    try {
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
      console.error("Password update error:", err);
      setStatus("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      // Delete user data first
      if (user) {
        const { error: dataError } = await supabase
          .from("user_data")
          .delete()
          .eq("user_id", user.id);

        if (dataError) throw dataError;
      }

      // Delete the user account
      const { error } = await supabase.auth.admin.deleteUser(user?.id || "");

      if (error) throw error;

      setStatus("Account deleted successfully. You will be logged out.");
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setStatus("Failed to delete account. Please try again.");
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
    <div className="flex items-start justify-center w-full m-0 p-0">
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
                Security Settings
              </h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label
                    htmlFor="current-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Current Password
                  </label>
                  <input
                    id="current-password"
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
                    htmlFor="new-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
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
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
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
                  {loading ? "Updating..." : "Change Password"}
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
                Appearance Settings
              </h2>
              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    darkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                >
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
                      Switch between light and dark themes
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
                <div
                  className={`p-4 rounded-lg ${
                    darkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <h4
                    className={`font-medium mb-2 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Preview
                  </h4>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Current theme:{" "}
                    <span className="font-medium">
                      {darkMode ? "Dark Mode" : "Light Mode"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === "danger" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-red-600">
                Danger Zone
              </h2>
              <div className="p-6 border border-red-200 rounded-lg bg-red-50">
                <h3 className="font-medium text-red-900 mb-2">
                  Delete Account
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            status.includes("successfully")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
};

export default Settings;
