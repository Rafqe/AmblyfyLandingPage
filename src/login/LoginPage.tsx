import React, { useState } from "react";
import { supabase } from "../config/supabase";
import { useNavigate } from "react-router-dom";
import {
  sanitizeError,
  isValidEmail,
  isValidPassword,
  globalRateLimiter,
  checkEmailExists,
} from "../utils/security";

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
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState<string>("");
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<string>("");
  const navigate = useNavigate();

  // Input validation using security utilities
  const validateEmail = isValidEmail;
  const validatePassword = isValidPassword;

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegStatus("");

    // Rate limiting check
    if (!globalRateLimiter.canAttempt("register", 10, 10 * 60 * 1000)) {
      setRegStatus(
        "Too many registration attempts. Please try again in 10 minutes."
      );
      setLoading(false);
      return;
    }

    // Validate inputs
    if (!validateEmail(regForm.email)) {
      setRegStatus("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!validatePassword(regForm.password)) {
      setRegStatus(
        "Password must be at least 8 characters and contain at least one number."
      );
      setLoading(false);
      return;
    }

    const email = regForm.email.trim().toLowerCase();

    try {
      // First, check if email already exists
      const emailExists = await checkEmailExists(email);

      if (emailExists) {
        setRegStatus(
          "An account with this email already exists. Please sign in instead. If you forgot your password, use the 'Forgot Password' option below."
        );
        return;
      }

      // Email doesn't exist, proceed with registration
      const { error } = await supabase.auth.signUp({
        email: email,
        password: regForm.password,
      });

      if (error) throw error;

      // Reset rate limiter on success
      globalRateLimiter.reset("register");

      setRegStatus(
        "Registration successful! Please check your email to confirm your account."
      );
      setRegForm(initialRegState);
    } catch (err: any) {
      // Handle specific error cases
      if (err.message && err.message.includes("User already registered")) {
        setRegStatus(
          "An account with this email already exists. Please sign in instead or reset your password if needed."
        );
      } else {
        const safeError = sanitizeError(err);
        setRegStatus(safeError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginStatus("");

    // Rate limiting check
    const loginKey = `login_${loginForm.email}`;
    if (!globalRateLimiter.canAttempt(loginKey, 5, 15 * 60 * 1000)) {
      setLoginStatus("Too many login attempts. Please try again later.");
      setLoading(false);
      return;
    }

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

      // Reset rate limiter on success
      globalRateLimiter.reset(loginKey);

      setLoginStatus("Login successful!");
      setLoginForm(initialLoginState);
      // Redirect to dashboard after successful login
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err: any) {
      const safeError = sanitizeError(err);
      setLoginStatus(safeError);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotPasswordStatus("");

    // Validate email
    if (!validateEmail(forgotPasswordEmail)) {
      setForgotPasswordStatus("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setForgotPasswordStatus(
        "Password reset instructions have been sent to your email address."
      );
      setForgotPasswordEmail("");
    } catch (err: any) {
      const safeError = sanitizeError(err);
      setForgotPasswordStatus(safeError);
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

              {/* Forgot Password Link */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-brand-cyan hover:text-brand-dark-blue transition-colors underline"
                >
                  Forgot your password?
                </button>
              </div>
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
                  <div className="text-xs text-gray-500 mt-1">
                    Must be 8+ characters with at least one number
                  </div>
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

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-brand-dark-blue">
                  Reset Password
                </h3>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordStatus("");
                    setForgotPasswordEmail("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-medium py-2 px-4 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Instructions"}
                </button>

                {forgotPasswordStatus && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium ${
                      forgotPasswordStatus.includes("sent")
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {forgotPasswordStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
