import React, { useState } from "react";
import { supabase } from "../config/supabase";
import { useNavigate } from "react-router-dom";

interface RegisterForm {
  email: string;
  password: string;
}

interface LoginForm {
  email: string;
  password: string;
}

const initialRegState: RegisterForm = {
  email: "",
  password: "",
};

const initialLoginState: LoginForm = {
  email: "",
  password: "",
};

const LoginPage: React.FC = () => {
  const [regForm, setRegForm] = useState<RegisterForm>(initialRegState);
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginState);
  const [regStatus, setRegStatus] = useState<string>("");
  const [loginStatus, setLoginStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const navigate = useNavigate();

  // Input validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegStatus("");

    // Validate inputs
    if (!validateEmail(regForm.email)) {
      setRegStatus("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!validatePassword(regForm.password)) {
      setRegStatus("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      // 1. Register user in Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password,
      });
      if (error) throw error;
      setRegStatus(
        "Registration successful! Please check your email to confirm your account."
      );
      setRegForm(initialRegState);
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegStatus("Registration failed. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginStatus("");

    // Validate email
    if (!validateEmail(loginForm.email)) {
      setLoginStatus("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });
      if (error) throw error;
      setLoginStatus("Login successful!");
      setLoginForm(initialLoginState);
      // Redirect to dashboard after successful login
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginStatus(
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-blue via-brand-cyan to-brand-dark-green flex items-center justify-center py-6 px-2 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-8 mx-auto">
        {/* Header */}
        <div className="text-center">
          <a href="/" className="inline-block mb-6">
            <img
              src="/assets/Amblify_logo_zilsfix.png"
              alt="Amblyfy"
              className="h-12 mx-auto"
            />
          </a>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark-blue mb-2">
            Welcome to Amblyfy
          </h2>
          <p className="text-gray-700 opacity-90 text-sm sm:text-base">
            Sign in to your account or create a new one
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 rounded-lg shadow overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "login"
                  ? "bg-brand-dark-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:text-brand-dark-blue"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "register"
                  ? "bg-brand-dark-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:text-brand-dark-blue"
              }`}
            >
              Register
            </button>
          </div>

          {/* Login Form */}
          {activeTab === "login" && (
            <div className="p-4 sm:p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
                {loginStatus && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium mt-2 ${
                      loginStatus.startsWith("Login successful")
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {loginStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Register Form */}
          {activeTab === "register" && (
            <div className="p-4 sm:p-8">
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="Enter your email"
                    value={regForm.email}
                    onChange={(e) =>
                      setRegForm({ ...regForm, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="Create a password"
                    value={regForm.password}
                    onChange={(e) =>
                      setRegForm({ ...regForm, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors placeholder-gray-400 text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
                {regStatus && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium mt-2 ${
                      regStatus.startsWith("Registration successful")
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {regStatus}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <a
            href="/"
            className="text-brand-dark-blue hover:text-brand-cyan transition-colors text-sm font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
