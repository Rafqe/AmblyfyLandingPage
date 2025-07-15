import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import Settings from "./Settings";
import Calendar from "./Calendar";
import Statistics from "./Statistics";
import LogEntry from "./LogEntry";
import GoalsManagement from "./GoalsManagement";
import PatientCalendarView from "./PatientCalendarView";
import PatientStatisticsView from "./PatientStatisticsView";
import DoctorInvitations from "./DoctorInvitations";

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{
    name: string;
    surname: string;
    account_type: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", surname: "" });
  const [profileStatus, setProfileStatus] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("darkMode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      // If localStorage fails or data is corrupted, default to false
      return false;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);

        // Try to get existing profile
        let { data: profileData } = await supabase
          .from("user_data")
          .select("name, surname, account_type")
          .eq("user_id", data.user.id)
          .single();

        // If no profile exists, create one
        if (!profileData) {
          const { data: newProfile, error } = await supabase
            .from("user_data")
            .insert([
              {
                user_id: data.user.id,
                email: data.user.email, // Include email for duplicate checking
                name: null,
                surname: null,
                account_type: "user",
              },
            ])
            .select("name, surname, account_type, email")
            .single();

          if (error) {
            // Only log detailed errors in development
            if (process.env.NODE_ENV === "development") {
              console.error("Error creating profile:", error);
            }
          } else {
            profileData = newProfile;
          }
        }

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
    // Clean up state before signing out to prevent API calls with invalid session
    setUser(null);
    setProfile(null);
    setCurrentPage("dashboard");

    await supabase.auth.signOut();
    navigate("/login");
  };

  // Helper for avatar/initials
  const getInitials = () => {
    if (profile?.name && profile?.surname) {
      return (
        profile.name.charAt(0).toUpperCase() +
        profile.surname.charAt(0).toUpperCase()
      );
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Helper to check if user is a doctor
  const isDoctor = profile?.account_type === "doctor";

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

      // Try to update existing profile, or create new one if it doesn't exist
      let { error } = await supabase
        .from("user_data")
        .update({
          name: profileForm.name.trim(),
          surname: profileForm.surname.trim(),
        })
        .eq("user_id", user.id);

      // If update fails (profile doesn't exist), create new profile
      if (error) {
        const { error: insertError } = await supabase.from("user_data").insert([
          {
            user_id: user.id,
            email: user.email, // Include email for duplicate checking
            name: profileForm.name.trim(),
            surname: profileForm.surname.trim(),
            account_type: "user",
          },
        ]);
        if (insertError) throw insertError;
      }

      setProfileStatus("Profile updated successfully!");
      // Reload profile
      const { data: profileData } = await supabase
        .from("user_data")
        .select("name, surname, account_type")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);
    } catch (err: any) {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === "development") {
        console.error("Profile update error:", err);
      }
      setProfileStatus("Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Show profile completion form if name or surname is empty
  const needsProfile = !profile?.name || !profile?.surname;

  // Dark mode toggle handler
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    try {
      localStorage.setItem("darkMode", JSON.stringify(newDarkMode));
    } catch {
      // If localStorage fails, continue without saving preference
      console.warn("Unable to save dark mode preference");
    }
  };

  // Profile update handler for Settings component
  const handleProfileUpdate = (updatedProfile: any) => {
    setProfile(updatedProfile);
    setProfileForm({
      name: updatedProfile.name || "",
      surname: updatedProfile.surname || "",
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-brand-dark-blue via-brand-cyan to-brand-dark-green text-white"
          : "bg-gradient-to-br from-brand-dark-blue via-brand-cyan to-brand-dark-green"
      }`}
    >
      {/* Navbar */}
      <header
        className={`${
          darkMode ? "bg-gray-700 shadow-gray-900" : "bg-white shadow-md"
        } w-full z-50 top-0 transition-colors duration-300`}
      >
        <nav className="container mx-auto flex items-center justify-between py-3 px-4 md:px-8 relative">
          {/* Logo */}
          <button
            onClick={() => setCurrentPage("dashboard")}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <img
              src={
                darkMode
                  ? "/assets/Amblify_logo_balts.png"
                  : "/assets/Amblify_logo_zilsfix.png"
              }
              alt="Amblyfy"
              className="h-10"
            />
          </button>
          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-1 lg:space-x-2 absolute left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => setCurrentPage("dashboard")}
              className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                currentPage === "dashboard"
                  ? "text-[#cad76a]"
                  : darkMode
                  ? "text-white hover:text-gray-100"
                  : "text-gray-700 hover:text-brand-dark-blue"
              }`}
            >
              Dashboard
            </button>
            {isDoctor && (
              <>
                <button
                  onClick={() => setCurrentPage("patients")}
                  className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                    currentPage === "patients"
                      ? "text-[#cad76a]"
                      : darkMode
                      ? "text-white hover:text-gray-100"
                      : "text-gray-700 hover:text-brand-dark-blue"
                  }`}
                >
                  Patients
                </button>
                <button
                  onClick={() => setCurrentPage("patient-calendar")}
                  className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                    currentPage === "patient-calendar"
                      ? "text-[#cad76a]"
                      : darkMode
                      ? "text-white hover:text-gray-100"
                      : "text-gray-700 hover:text-brand-dark-blue"
                  }`}
                >
                  Patient Calendar
                </button>
                <button
                  onClick={() => setCurrentPage("patient-stats")}
                  className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                    currentPage === "patient-stats"
                      ? "text-[#cad76a]"
                      : darkMode
                      ? "text-white hover:text-gray-100"
                      : "text-gray-700 hover:text-brand-dark-blue"
                  }`}
                >
                  Patient Stats
                </button>
              </>
            )}
            {!isDoctor && (
              <>
                <button
                  onClick={() => setCurrentPage("calendar")}
                  className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                    currentPage === "calendar"
                      ? "text-[#cad76a]"
                      : darkMode
                      ? "text-white hover:text-gray-100"
                      : "text-gray-700 hover:text-brand-dark-blue"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setCurrentPage("statistics")}
                  className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                    currentPage === "statistics"
                      ? "text-[#cad76a]"
                      : darkMode
                      ? "text-white hover:text-gray-100"
                      : "text-gray-700 hover:text-brand-dark-blue"
                  }`}
                >
                  Statistics
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage("settings")}
              className={`font-extrabold transition-colors rounded-md px-2 py-2 text-xs lg:text-sm ${
                currentPage === "settings"
                  ? "text-[#cad76a]"
                  : darkMode
                  ? "text-white hover:text-gray-100"
                  : "text-gray-700 hover:text-brand-dark-blue"
              }`}
            >
              Settings
            </button>
          </div>
          {/* User Info & Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow">
                {getInitials()}
              </div>
              <span
                className={`font-semibold text-sm lg:text-base ${
                  darkMode ? "text-white" : "text-brand-dark-blue"
                }`}
              >
                {profile?.name && profile?.surname
                  ? `${profile.name} ${profile.surname}`
                  : user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className={`font-medium px-3 py-1.5 rounded-md shadow-sm transition-colors text-xs lg:text-sm ${
                darkMode
                  ? "bg-gray-100 text-gray-800 hover:bg-white"
                  : "bg-brand-dark-blue text-white hover:bg-brand-cyan"
              }`}
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
              className={`w-7 h-7 ${
                darkMode ? "text-white" : "text-brand-dark-blue"
              }`}
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
            <div
              className={`absolute top-full left-0 w-full shadow-lg rounded-b-xl py-4 px-4 flex flex-col space-y-2 md:hidden animate-fade-in z-50 ${
                darkMode ? "bg-gray-700" : "bg-white"
              }`}
            >
              <button
                onClick={() => {
                  setCurrentPage("dashboard");
                  setMobileMenuOpen(false);
                }}
                className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                  currentPage === "dashboard"
                    ? "text-[#cad76a]"
                    : darkMode
                    ? "text-white hover:text-gray-100"
                    : "text-gray-700 hover:text-brand-dark-blue"
                }`}
              >
                Dashboard
              </button>
              {isDoctor && (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage("patients");
                      setMobileMenuOpen(false);
                    }}
                    className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                      currentPage === "patients"
                        ? "text-[#cad76a]"
                        : darkMode
                        ? "text-white hover:text-gray-100"
                        : "text-gray-700 hover:text-brand-dark-blue"
                    }`}
                  >
                    Patients
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage("patient-calendar");
                      setMobileMenuOpen(false);
                    }}
                    className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                      currentPage === "patient-calendar"
                        ? "text-[#cad76a]"
                        : darkMode
                        ? "text-white hover:text-gray-100"
                        : "text-gray-700 hover:text-brand-dark-blue"
                    }`}
                  >
                    Patient Calendar
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage("patient-stats");
                      setMobileMenuOpen(false);
                    }}
                    className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                      currentPage === "patient-stats"
                        ? "text-[#cad76a]"
                        : darkMode
                        ? "text-white hover:text-gray-100"
                        : "text-gray-700 hover:text-brand-dark-blue"
                    }`}
                  >
                    Patient Stats
                  </button>
                </>
              )}
              {!isDoctor && (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage("calendar");
                      setMobileMenuOpen(false);
                    }}
                    className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                      currentPage === "calendar"
                        ? "text-[#cad76a]"
                        : darkMode
                        ? "text-white hover:text-gray-100"
                        : "text-gray-700 hover:text-brand-dark-blue"
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage("statistics");
                      setMobileMenuOpen(false);
                    }}
                    className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                      currentPage === "statistics"
                        ? "text-[#cad76a]"
                        : darkMode
                        ? "text-white hover:text-gray-100"
                        : "text-gray-700 hover:text-brand-dark-blue"
                    }`}
                  >
                    Statistics
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setCurrentPage("settings");
                  setMobileMenuOpen(false);
                }}
                className={`font-extrabold transition-colors rounded-md px-3 py-2 text-base ${
                  currentPage === "settings"
                    ? "text-[#cad76a]"
                    : darkMode
                    ? "text-white hover:text-gray-100"
                    : "text-gray-700 hover:text-brand-dark-blue"
                }`}
              >
                Settings
              </button>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-9 h-9 rounded-full bg-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow">
                  {getInitials()}
                </div>
                <span
                  className={`font-semibold text-base ${
                    darkMode ? "text-white" : "text-brand-dark-blue"
                  }`}
                >
                  {profile?.name && profile?.surname
                    ? `${profile.name} ${profile.surname}`
                    : user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className={`w-full font-medium px-3 py-1.5 rounded-md shadow-sm transition-colors mt-2 ${
                  darkMode
                    ? "bg-gray-100 text-gray-800 hover:bg-white"
                    : "bg-brand-dark-blue text-white hover:bg-brand-cyan"
                }`}
              >
                Log Out
              </button>
            </div>
          )}
        </nav>
      </header>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {/* Settings Page */}
        <div className={currentPage === "settings" ? "block" : "hidden"}>
          <Settings
            user={user}
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
            darkMode={darkMode}
            onDarkModeToggle={handleDarkModeToggle}
          />
        </div>

        {/* Doctor Pages */}
        {isDoctor && (
          <>
            {/* Patients Management */}
            <div
              className="flex items-start justify-center w-full m-0 p-0"
              style={{ display: currentPage === "patients" ? "flex" : "none" }}
            >
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <GoalsManagement user={user} darkMode={darkMode} />
              </div>
            </div>

            {/* Patient Calendar View */}
            <div
              className="flex items-start justify-center w-full m-0 p-0"
              style={{
                display: currentPage === "patient-calendar" ? "flex" : "none",
              }}
            >
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <PatientCalendarView user={user} darkMode={darkMode} />
              </div>
            </div>

            {/* Patient Statistics View */}
            <div
              className="flex items-start justify-center w-full m-0 p-0"
              style={{
                display: currentPage === "patient-stats" ? "flex" : "none",
              }}
            >
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <PatientStatisticsView user={user} darkMode={darkMode} />
              </div>
            </div>
          </>
        )}

        {/* Patient Pages */}
        {!isDoctor && (
          <>
            {/* Patient Calendar */}
            <div
              className={
                currentPage === "calendar"
                  ? "flex items-start justify-center w-full m-0 p-0"
                  : "hidden"
              }
            >
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <Calendar
                  user={user}
                  darkMode={darkMode}
                  key={`calendar-${refreshKey}`}
                />
              </div>
            </div>

            {/* Patient Statistics */}
            <div
              className={
                currentPage === "statistics"
                  ? "flex items-start justify-center w-full m-0 p-0"
                  : "hidden"
              }
            >
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <Statistics
                  user={user}
                  darkMode={darkMode}
                  key={`statistics-${refreshKey}`}
                />
              </div>
            </div>
          </>
        )}

        {/* Dashboard Home */}
        <div
          className={
            currentPage === "dashboard"
              ? "flex items-start justify-center w-full m-0 p-0"
              : "hidden"
          }
        >
          <div className="flex items-start justify-center w-full m-0 p-0">
            {needsProfile ? (
              <div
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] flex flex-col items-center space-y-6 overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h2
                  className={`text-2xl font-bold text-center ${
                    darkMode ? "text-white" : "text-brand-dark-blue"
                  }`}
                >
                  Complete Your Profile
                </h2>
                <form
                  onSubmit={handleProfileSubmit}
                  className="w-full space-y-4"
                >
                  <div>
                    <label
                      htmlFor="profile-name"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
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
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-surname"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Last Name
                    </label>
                    <input
                      id="profile-surname"
                      type="text"
                      value={profileForm.surname}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          surname: e.target.value,
                        })
                      }
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform-gpu hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-base"
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
              <div
                // Card height now accounts for navbar (64px). Adjust 64px if navbar height changes.
                className={`w-full max-w-screen-lg h-[calc(100dvh-30px-50px-64px)] lg:mt-[30px] lg:ml-[70px] lg:mr-[70px] lg:mb-[50px] md:mt-4 md:ml-6 md:mr-6 md:mb-6 mt-2 ml-2 mr-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-[30px] flex flex-col items-center space-y-6 overflow-auto ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h1
                  className={`text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 text-center ${
                    darkMode ? "text-white" : "text-brand-dark-blue"
                  }`}
                >
                  Welcome, {isDoctor ? `Dr. ${profile?.name}` : profile?.name}!
                </h1>
                <p
                  className={`text-base sm:text-lg text-center mb-4 sm:mb-6 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {isDoctor
                    ? "Welcome to your doctor dashboard. Manage your patients, set goals, and track their progress."
                    : "This is your personal space. Here you will find your stats, progress, and more features coming soon!"}
                </p>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {isDoctor ? (
                    <>
                      {/* Doctor Dashboard Content */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 col-span-1 lg:col-span-2">
                        <button
                          onClick={() => setCurrentPage("patients")}
                          className="bg-gradient-to-b from-brand-cyan to-brand-light-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 ease-out transform-gpu min-h-[120px] w-full"
                        >
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            👥
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Manage Patients
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            Set goals and track progress
                          </span>
                        </button>
                        <button
                          onClick={() => setCurrentPage("patient-calendar")}
                          className="bg-gradient-to-b from-brand-dark-green to-brand-pale-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 ease-out transform-gpu min-h-[120px] w-full"
                        >
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            📅
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Patient Calendar
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            View patient activity
                          </span>
                        </button>
                        <button
                          onClick={() => setCurrentPage("patient-stats")}
                          className="bg-gradient-to-b from-brand-dark-blue to-brand-cyan rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 ease-out transform-gpu min-h-[120px] w-full"
                        >
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            📊
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Patient Statistics
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            Progress tracking
                          </span>
                        </button>
                        <div className="bg-gradient-to-b from-brand-yellow to-brand-pale-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center min-h-[120px] w-full opacity-60">
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            📝
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Patient Notes
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            Coming soon
                          </span>
                        </div>
                        <div className="bg-gradient-to-b from-brand-cyan to-brand-dark-blue rounded-xl shadow-lg p-5 flex flex-col items-center justify-center min-h-[120px] w-full opacity-60">
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            📈
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Analytics Dashboard
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            Coming soon
                          </span>
                        </div>
                        <button
                          onClick={() => setCurrentPage("settings")}
                          className="bg-gradient-to-b from-brand-pale-green to-brand-light-green rounded-xl shadow-lg p-5 flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 ease-out transform-gpu min-h-[120px] w-full"
                        >
                          <span className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            ⚙️
                          </span>
                          <span className="text-base sm:text-lg font-semibold text-white mb-1">
                            Settings
                          </span>
                          <span className="text-white opacity-80 text-xs sm:text-sm">
                            Manage account
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Patient Dashboard Content */}
                      {/* Log Entry Component - prioritized for quick activity logging */}
                      <LogEntry
                        user={user}
                        darkMode={darkMode}
                        onLogAdded={() => {
                          // Force refresh of statistics and calendar when log is added
                          setRefreshKey((prev) => prev + 1);
                        }}
                      />

                      {/* Doctor Invitations Component - shows healthcare team info */}
                      <DoctorInvitations user={user} darkMode={darkMode} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
