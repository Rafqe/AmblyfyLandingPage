import React, { useState } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

interface LogEntryProps {
  user: User | null;
  darkMode: boolean;
  onLogAdded?: () => void;
}

interface LogForm {
  date: string;
  hours: number;
  minutes: number;
  notes: string;
}

const LogEntry: React.FC<LogEntryProps> = ({ user, darkMode, onLogAdded }) => {
  // Helper function to get local date string without timezone shift
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [logForm, setLogForm] = useState<LogForm>({
    date: getLocalDateString(),
    hours: 0,
    minutes: 0,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const totalMinutes = logForm.hours * 60 + logForm.minutes;

    // Safety validations
    if (totalMinutes < 30) {
      setStatus("Minimum session duration is 30 minutes for safety reasons.");
      return;
    }

    if (totalMinutes > 1440) {
      setStatus("Time cannot exceed 24 hours in a day.");
      return;
    }

    // Check date is not more than 5 days ago
    // Convert both dates to local date strings to avoid timezone issues
    const selectedDateStr = logForm.date;
    const todayStr = getLocalDateString();
    const fiveDaysAgoStr = getLocalDateString(
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    );

    if (selectedDateStr < fiveDaysAgoStr) {
      setStatus("You can only log activities for the last 5 days.");
      return;
    }

    if (selectedDateStr > todayStr) {
      setStatus("You cannot log activities for future dates.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");

      // Check existing entries for this date (max 10 per day)
      const { data: existingEntries, error: checkError } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", logForm.date);

      if (checkError) throw checkError;

      if (existingEntries && existingEntries.length >= 10) {
        setStatus(
          "Maximum of 10 activity entries per day allowed for safety reasons."
        );
        setLoading(false);
        return;
      }

      // Always create new entry (no more updating existing ones)
      const { error: insertError } = await supabase.from("daily_logs").insert([
        {
          user_id: user.id,
          date: logForm.date,
          time_spent_minutes: totalMinutes,
          notes: logForm.notes ? logForm.notes.trim().substring(0, 1000) : null,
        },
      ]);

      if (insertError) throw insertError;

      const entryCount = (existingEntries?.length || 0) + 1;
      setStatus(
        `Added activity entry ${entryCount} for ${
          logForm.date
        }. Duration: ${formatTime(totalMinutes)}`
      );

      // Reset form
      setLogForm({
        date: getLocalDateString(),
        hours: 0,
        minutes: 0,
        notes: "",
      });

      // Call callback if provided
      if (onLogAdded) {
        onLogAdded();
      }
    } catch (error) {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error saving log:", error);
      }
      setStatus("Failed to save log. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleQuickTime = (hours: number, minutes: number = 0) => {
    setLogForm({
      ...logForm,
      hours,
      minutes,
    });
  };

  const totalMinutes = logForm.hours * 60 + logForm.minutes;

  return (
    <div
      className={`rounded-lg p-6 ${
        darkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg`}
    >
      <h3
        className={`text-xl font-semibold mb-4 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Log Your Activity
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Date
          </label>
          <div
            className={`relative w-full px-4 py-3 border rounded-lg focus-within:ring-2 focus-within:ring-brand-cyan focus-within:border-transparent transition-colors cursor-pointer ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "border-gray-300"
            }`}
            onClick={() => {
              const input = document.getElementById(
                "date-input"
              ) as HTMLInputElement;
              if (input) {
                input.focus();
                if (input.showPicker) {
                  input.showPicker();
                }
              }
            }}
          >
            <input
              id="date-input"
              type="date"
              value={logForm.date}
              onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
              min={getLocalDateString(
                new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
              )} // 5 days ago
              max={getLocalDateString()} // Prevent future dates
              className={`w-full bg-transparent border-none outline-none text-inherit cursor-pointer ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
              required
            />
            {/* Calendar icon overlay */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg
                className={`w-5 h-5 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Hours
            </label>
            <input
              type="number"
              min="0"
              max="24"
              value={logForm.hours}
              onChange={(e) =>
                setLogForm({
                  ...logForm,
                  hours: Math.max(
                    0,
                    Math.min(24, parseInt(e.target.value) || 0)
                  ),
                })
              }
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "border-gray-300"
              }`}
            />
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Minutes
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="10"
              value={logForm.minutes}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                // Round to nearest 10, max 50
                const roundedValue = Math.min(50, Math.round(value / 10) * 10);
                setLogForm({
                  ...logForm,
                  minutes: Math.max(0, roundedValue),
                });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "border-gray-300"
              }`}
            />
          </div>
        </div>

        {/* Notes Field */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Notes (optional)
          </label>
          <textarea
            value={logForm.notes}
            onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            placeholder="Add any notes about your session..."
            rows={3}
            maxLength={1000}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors resize-none ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "border-gray-300 placeholder-gray-500"
            }`}
          />
          <div
            className={`text-xs mt-1 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {logForm.notes.length}/1000 characters
          </div>
        </div>

        {/* Quick Time Buttons */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Quick Select
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickTime(0, 30)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                darkMode
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              30m
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime(1)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                darkMode
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              1h
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime(2)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                darkMode
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              2h
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime(4)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                darkMode
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              4h
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || totalMinutes <= 0}
          className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform-gpu hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Activity Log"}
        </button>

        {status && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              status.includes("Added") || status.includes("Updated")
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
      </form>
    </div>
  );
};

export default LogEntry;
