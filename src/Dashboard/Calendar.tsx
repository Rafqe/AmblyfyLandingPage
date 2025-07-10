import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

interface CalendarProps {
  user: User | null;
  darkMode: boolean;
}

interface DailyLogEntry {
  id: string;
  date: string;
  time_spent_minutes: number;
  notes?: string;
  created_at?: string;
}

interface DailyLog {
  date: string;
  total_minutes: number;
  entries: DailyLogEntry[];
  hasNotes: boolean;
}

interface UserGoals {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
}

const Calendar: React.FC<CalendarProps> = ({ user, darkMode }) => {
  // Helper function to get local date string without timezone shift
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    daily_goal_minutes: 240,
    weekly_goal_minutes: 1680,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<{
    day: number;
    log: DailyLog | undefined;
  } | null>(null);

  // Get calendar data for current month
  useEffect(() => {
    if (user) {
      setLoading(true);
      setDailyLogs([]); // Clear previous month's data
      fetchCalendarData();
      fetchUserGoals();
    }
  }, [user, currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCalendarData = async () => {
    if (!user) return;

    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    try {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, time_spent_minutes, notes, created_at")
        .eq("user_id", user.id)
        .gte("date", getLocalDateString(startOfMonth))
        .lte("date", getLocalDateString(endOfMonth))
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group entries by date and sum up the time
      const groupedLogs: DailyLog[] = [];
      const logsByDate = new Map<string, DailyLogEntry[]>();

      (data || []).forEach((entry: DailyLogEntry) => {
        if (!logsByDate.has(entry.date)) {
          logsByDate.set(entry.date, []);
        }
        logsByDate.get(entry.date)!.push(entry);
      });

      logsByDate.forEach((entries, date) => {
        const totalMinutes = entries.reduce(
          (sum, entry) => sum + entry.time_spent_minutes,
          0
        );
        const hasNotes = entries.some(
          (entry) => entry.notes && entry.notes.trim().length > 0
        );

        groupedLogs.push({
          date,
          total_minutes: totalMinutes,
          entries,
          hasNotes,
        });
      });

      setDailyLogs(groupedLogs);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_goals")
        .select("daily_goal_minutes, weekly_goal_minutes")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setUserGoals(data);
      } else {
        // Create default goals if none exist
        const { error: insertError } = await supabase
          .from("user_goals")
          .insert([
            {
              user_id: user.id,
              daily_goal_minutes: 240,
              weekly_goal_minutes: 1680,
            },
          ]);

        if (insertError)
          console.error("Error creating default goals:", insertError);
      }
    } catch (error) {
      console.error("Error fetching user goals:", error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getLogForDate = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const dateStr = getLocalDateString(date);
    return dailyLogs.find((log) => log.date === dateStr);
  };

  const getDayColor = (log: DailyLog | undefined) => {
    if (!log)
      return darkMode
        ? "bg-gray-700 text-gray-300"
        : "bg-gray-100 text-gray-600";

    const percentage = (log.total_minutes / userGoals.daily_goal_minutes) * 100;

    if (percentage >= 100) return "bg-green-500 text-white";
    if (percentage >= 75) return "bg-green-400 text-white";
    if (percentage >= 50) return "bg-yellow-400 text-gray-900";
    if (percentage >= 25) return "bg-orange-400 text-white";
    return "bg-red-400 text-white";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const year = prev.getFullYear();
      const month = prev.getMonth();

      if (direction === "prev") {
        // Go to previous month
        if (month === 0) {
          return new Date(year - 1, 11, 1); // December of previous year
        } else {
          return new Date(year, month - 1, 1);
        }
      } else {
        // Go to next month
        if (month === 11) {
          return new Date(year + 1, 0, 1); // January of next year
        } else {
          return new Date(year, month + 1, 1);
        }
      }
    });
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = getDaysInMonth();

  // Calculate monthly stats
  const monthlyTotal = dailyLogs.reduce(
    (sum, log) => sum + log.total_minutes,
    0
  );
  const monthlyAverage =
    dailyLogs.length > 0 ? monthlyTotal / dailyLogs.length : 0;
  const daysWithData = dailyLogs.filter((log) => log.total_minutes > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative w-full">
        {/* Centered heading */}
        <div className="flex items-center justify-center w-full">
          <h2
            className={`text-2xl font-bold ${
              darkMode ? "text-white" : "text-brand-dark-blue"
            }`}
          >
            Activity Calendar
          </h2>
        </div>
        {/* Month navigation positioned absolutely on the right */}
        <div className="absolute top-0 right-0 flex items-center space-x-4">
          <button
            onClick={() => navigateMonth("prev")}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ←
          </button>
          <h3
            className={`text-xl font-semibold min-w-[200px] text-center ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth("next")}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className={`rounded-lg p-4 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className={`text-center font-semibold py-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-20"></div>;
            }

            const log = getLogForDate(day);
            const isToday =
              getLocalDateString() ===
              getLocalDateString(
                new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              );

            return (
              <div
                key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
                onClick={() => setSelectedDay({ day, log })}
                className={`h-20 p-2 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
                  isToday ? "border-brand-cyan" : "border-transparent"
                } ${getDayColor(log)} relative overflow-hidden`}
              >
                <div className="font-semibold text-sm">{day}</div>
                {log && (
                  <div className="text-xs mt-1">
                    {formatTime(log.total_minutes)}
                    {log.entries.length > 1 && (
                      <div className="text-xs text-gray-400">
                        {log.entries.length} entries
                      </div>
                    )}
                  </div>
                )}
                {log?.hasNotes && (
                  <div className="absolute bottom-1 right-1">
                    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
        <div
          className={`p-4 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <h4
            className={`font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Monthly Total
          </h4>
          <p
            className={`text-2xl font-bold ${
              darkMode ? "text-green-400" : "text-green-600"
            }`}
          >
            {formatTime(monthlyTotal)}
          </p>
        </div>

        <div
          className={`p-4 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <h4
            className={`font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Daily Average
          </h4>
          <p
            className={`text-2xl font-bold ${
              darkMode ? "text-blue-400" : "text-blue-600"
            }`}
          >
            {formatTime(Math.round(monthlyAverage))}
          </p>
        </div>

        <div
          className={`p-4 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <h4
            className={`font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Active Days
          </h4>
          <p
            className={`text-2xl font-bold ${
              darkMode ? "text-purple-400" : "text-purple-600"
            }`}
          >
            {daysWithData}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div
        className={`p-4 rounded-lg ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        <h4
          className={`font-semibold mb-3 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Goal Achievement Legend
        </h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              100%+ Goal
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              75-99%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              50-74%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              25-49%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              0-24%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-4 h-4 rounded ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            ></div>
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              No Data
            </span>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {monthNames[currentDate.getMonth()]} {selectedDay.day},{" "}
                {currentDate.getFullYear()}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className={`text-2xl ${
                  darkMode
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ×
              </button>
            </div>

            {selectedDay.log ? (
              <div className="space-y-4">
                <div>
                  <h4
                    className={`font-semibold mb-2 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Total Time Spent
                  </h4>
                  <p
                    className={`text-lg ${
                      darkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {formatTime(selectedDay.log.total_minutes)}
                  </p>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Goal: {formatTime(userGoals.daily_goal_minutes)} (
                    {Math.round(
                      (selectedDay.log.total_minutes /
                        userGoals.daily_goal_minutes) *
                        100
                    )}
                    %)
                  </div>
                </div>

                <div>
                  <h4
                    className={`font-semibold mb-2 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Activity Entries ({selectedDay.log.entries.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedDay.log.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span
                              className={`font-medium ${
                                darkMode ? "text-green-400" : "text-green-600"
                              }`}
                            >
                              {formatTime(entry.time_spent_minutes)}
                            </span>
                            <div
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Entry #{index + 1}
                            </div>
                          </div>
                        </div>
                        {entry.notes && (
                          <div
                            className={`mt-2 text-sm ${
                              darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-8 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <p>No activity logged for this day.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
