import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./config/supabase";
import LandingPage from "./LandingPage";
import LoginPage from "./login/LoginPage";
import Dashboard from "./Dashboard/Dashboard";
import "./App.css";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activityTimer: NodeJS.Timeout;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // If signed out, clear any activity timers
      if (!session) {
        if (activityTimer) clearTimeout(activityTimer);
      }
    });

    // Auto-logout after 24 hours of inactivity
    const resetActivityTimer = () => {
      if (activityTimer) clearTimeout(activityTimer);

      activityTimer = setTimeout(async () => {
        if (session) {
          await supabase.auth.signOut();
          alert(
            "You have been logged out due to inactivity for security reasons."
          );
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    };

    // Track user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      if (session) resetActivityTimer();
    };

    // Add activity listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer if there's a session
    if (session) resetActivityTimer();

    return () => {
      subscription.unsubscribe();
      if (activityTimer) clearTimeout(activityTimer);

      // Remove activity listeners
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark-blue via-brand-cyan to-brand-dark-green flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin h-8 w-8 text-brand-dark-blue"
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
            <span className="ml-3 text-brand-dark-blue font-medium">
              Loading...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            session ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />
        <Route
          path="/login"
          element={
            session ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
