import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";

const navLinks = [
  { name: "Home", href: "/dashboard" },
  { name: "Progress", href: "#" },
  { name: "Messages", href: "#" },
  { name: "Guides", href: "#" },
  { name: "Support", href: "#" },
  { name: "Settings", href: "#" },
];

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", surname: "" });
  const [profileStatus, setProfileStatus] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        const { data: profileData } = await supabase
          .from("user_data")
          .select("name, surname, account_type")
          .eq("user_id", data.user.id)
          .single();
        setProfile(profileData);
        if (profileData) {
          setProfileForm({
            name: profileData.name || "",
            surname: profileData.surname || "",
          });
        }
      } else {
        navigate("/login");
      }
    };
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Helper for avatar/initials
  const getInitials = () => {
    if (profileForm.name && profileForm.surname) {
      return (
        profileForm.name.charAt(0).toUpperCase() +
        profileForm.surname.charAt(0).toUpperCase()
      );
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Input validation
  const validateName = (name: string): boolean => {
    return name.trim().length >= 2 && /^[a-zA-Z\s-']+$/.test(name.trim());
  };

  // Profile completion form submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus("");

    // Validate inputs
    if (!validateName(profileForm.name)) {
      setProfileStatus(
        "Name must be at least 2 characters and contain only letters."
      );
      setProfileLoading(false);
      return;
    }

    if (!validateName(profileForm.surname)) {
      setProfileStatus(
        "Surname must be at least 2 characters and contain only letters."
      );
      setProfileLoading(false);
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
      setProfileStatus("Profile updated successfully!");
      // Reload profile
      const { data: profileData } = await supabase
        .from("user_data")
        .select("name, surname, account_type")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setProfileStatus("Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Show profile completion form if name or surname is empty
  const needsProfile = !profile?.name || !profile?.surname;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-blue via-brand-cyan to-brand-dark-green flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-md w-full z-50 top-0">
        <nav className="container mx-auto flex items-center justify-between py-3 px-4 md:px-8 relative">
          {/* Logo */}
          <a href="/dashboard" className="flex items-center space-x-2">
            <img
              src="/assets/Amblify_logo_zilsfix.png"
              alt="Amblyfy"
              className="h-10"
            />
          </a>
          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-2 lg:space-x-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-700 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2 text-sm lg:text-base"
              >
                {link.name}
              </a>
            ))}
          </div>
          {/* User Info & Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow">
                {getInitials()}
              </div>
              <span className="text-brand-dark-blue font-semibold text-sm lg:text-base">
                {profileForm.name && profileForm.surname
                  ? `${profileForm.name} ${profileForm.surname}`
                  : user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-brand-dark-blue text-white font-bold px-4 py-2 rounded-md shadow hover:bg-brand-cyan transition-colors text-sm lg:text-base"
            >
              Log Out
            </button>
          </div>
          {/* Hamburger for mobile */}
          <button
            className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-7 h-7 text-brand-dark-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-b-xl py-4 px-4 flex flex-col space-y-2 md:hidden animate-fade-in z-50">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2 text-base"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-9 h-9 rounded-full bg-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow">
                  {getInitials()}
                </div>
                <span className="text-brand-dark-blue font-semibold text-base">
                  {profileForm.name && profileForm.surname
                    ? `${profileForm.name} ${profileForm.surname}`
                    : user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full bg-brand-dark-blue text-white font-bold px-4 py-2 rounded-md shadow hover:bg-brand-cyan transition-colors mt-2"
              >
                Log Out
              </button>
            </div>
          )}
        </nav>
      </header>
      {/* Main Dashboard Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 px-2 sm:px-4 lg:px-8 w-full">
        {needsProfile ? (
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-brand-dark-blue text-center">
              Complete Your Profile
            </h2>
            <form onSubmit={handleProfileSubmit} className="w-full space-y-4">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-surname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name
                </label>
                <input
                  id="profile-surname"
                  type="text"
                  value={profileForm.surname}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, surname: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                />
              </div>
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {profileLoading ? "Saving..." : "Save Profile"}
              </button>
              {profileStatus && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium mt-2 ${
                    profileStatus.startsWith("Profile updated")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileStatus}
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl p-4 sm:p-8 flex flex-col items-center space-y-6 sm:space-y-8 mt-4 sm:mt-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark-blue mb-2 text-center">
              Welcome, {profile?.name}!
            </h1>
            <p className="text-base sm:text-lg text-gray-600 text-center mb-4 sm:mb-6">
              This is your personal space. Here you will find your stats,
              progress, and more features coming soon!
            </p>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-b from-brand-cyan to-brand-light-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200 min-h-[120px] w-full">
                <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  🎯
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mb-1">
                  Your Progress
                </span>
                <span className="text-white opacity-80 text-xs sm:text-sm">
                  Coming soon
                </span>
              </div>
              <div className="bg-gradient-to-b from-brand-dark-green to-brand-pale-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200 min-h-[120px] w-full">
                <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  📊
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mb-1">
                  Statistics
                </span>
                <span className="text-white opacity-80 text-xs sm:text-sm">
                  Coming soon
                </span>
              </div>
              <div className="bg-gradient-to-b from-brand-dark-blue to-brand-cyan rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200 min-h-[120px] w-full">
                <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  📝
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mb-1">
                  Notes & Reminders
                </span>
                <span className="text-white opacity-80 text-xs sm:text-sm">
                  Coming soon
                </span>
              </div>
              <div className="bg-gradient-to-b from-brand-yellow to-brand-pale-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200 min-h-[120px] w-full">
                <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  ⚙️
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mb-1">
                  Settings
                </span>
                <span className="text-white opacity-80 text-xs sm:text-sm">
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
