import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

interface StatisticsProps {
  user: User | null;
  darkMode: boolean;
}

interface DailyLog {
  date: string;
  time_spent_minutes: number;
}

interface UserGoals {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
}

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size,
  strokeWidth,
  color,
  backgroundColor = "#e5e7eb",
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  // Allow progress to exceed 100% but cap visual representation at 100%
  const visualPercentage = Math.min(percentage, 100);
  const strokeDashoffset =
    circumference - (visualPercentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

const Statistics: React.FC<StatisticsProps> = ({ user, darkMode }) => {
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    daily_goal_minutes: 240,
    weekly_goal_minutes: 1680,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatisticsData();
      fetchUserGoals();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStatisticsData = async () => {
    if (!user) return;

    // Helper function to get local date string without timezone shift
    const getLocalDateString = (date: Date = new Date()) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const today = getLocalDateString();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week (Sunday)
    const weekStartStr = getLocalDateString(weekStart);

    try {
      // Fetch all entries for this week (including today)
      const { data: allData, error: fetchError } = await supabase
        .from("daily_logs")
        .select("date, time_spent_minutes")
        .eq("user_id", user.id)
        .gte("date", weekStartStr)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      // Group entries by date and sum up the time
      const groupedData = new Map<string, number>();
      (allData || []).forEach((entry) => {
        const currentTotal = groupedData.get(entry.date) || 0;
        groupedData.set(entry.date, currentTotal + entry.time_spent_minutes);
      });

      // Create DailyLog objects from grouped data
      const weeklyLogs: DailyLog[] = Array.from(groupedData.entries()).map(
        ([date, totalMinutes]) => ({
          date,
          time_spent_minutes: totalMinutes,
        })
      );

      // Set today's log
      const todayTotal = groupedData.get(today) || 0;
      setTodayLog({ date: today, time_spent_minutes: todayTotal });

      // Set weekly logs
      setWeeklyLogs(weeklyLogs);
    } catch (error) {
      console.error("Error fetching statistics data:", error);
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getDayName = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  // Calculate statistics
  const todayMinutes = todayLog?.time_spent_minutes || 0;
  const dailyPercentage = (todayMinutes / userGoals.daily_goal_minutes) * 100;

  const weeklyTotal = weeklyLogs.reduce(
    (sum, log) => sum + log.time_spent_minutes,
    0
  );
  const weeklyPercentage = (weeklyTotal / userGoals.weekly_goal_minutes) * 100;

  // Create weekly progress for each day
  const weeklyProgress = [];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // Helper function to get local date string without timezone shift
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);
    const dateStr = getLocalDateString(currentDay);
    const log = weeklyLogs.find((log) => log.date === dateStr);
    const dayPercentage = log
      ? (log.time_spent_minutes / userGoals.daily_goal_minutes) * 100
      : 0;

    weeklyProgress.push({
      date: currentDay,
      minutes: log?.time_spent_minutes || 0,
      percentage: dayPercentage,
      isToday: dateStr === getLocalDateString(),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2
          className={`text-3xl font-bold mb-2 ${
            darkMode ? "text-white" : "text-brand-dark-blue"
          }`}
        >
          Activity Statistics
        </h2>
        <p
          className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Track your daily and weekly progress
        </p>
      </div>

      {/* Main Progress Circles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily Progress */}
        <div
          className={`p-8 rounded-2xl ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg text-center`}
        >
          <h3
            className={`text-xl font-semibold mb-6 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Today's Goal
          </h3>

          <CircularProgress
            percentage={dailyPercentage}
            size={200}
            strokeWidth={16}
            color={dailyPercentage >= 100 ? "#22c55e" : "#10b981"}
            backgroundColor={darkMode ? "#374151" : "#e5e7eb"}
          >
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {Math.round(dailyPercentage)}%
              </div>
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {formatTime(todayMinutes)} /{" "}
                {formatTime(userGoals.daily_goal_minutes)}
              </div>
            </div>
          </CircularProgress>

          <div className="mt-6">
            <div
              className={`text-lg font-semibold ${
                dailyPercentage >= 100
                  ? "text-green-500"
                  : dailyPercentage >= 75
                  ? "text-green-400"
                  : dailyPercentage >= 50
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {dailyPercentage >= 100
                ? "Goal Achieved!"
                : dailyPercentage >= 75
                ? "Almost There!"
                : dailyPercentage >= 50
                ? "Good Progress"
                : "Keep Going!"}
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div
          className={`p-8 rounded-2xl ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg text-center`}
        >
          <h3
            className={`text-xl font-semibold mb-6 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            This Week's Goal
          </h3>

          <CircularProgress
            percentage={weeklyPercentage}
            size={200}
            strokeWidth={16}
            color={weeklyPercentage >= 100 ? "#2563eb" : "#3b82f6"}
            backgroundColor={darkMode ? "#374151" : "#e5e7eb"}
          >
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {Math.round(weeklyPercentage)}%
              </div>
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {formatTime(weeklyTotal)} /{" "}
                {formatTime(userGoals.weekly_goal_minutes)}
              </div>
            </div>
          </CircularProgress>

          <div className="mt-6">
            <div
              className={`text-lg font-semibold ${
                weeklyPercentage >= 100
                  ? "text-blue-500"
                  : weeklyPercentage >= 75
                  ? "text-blue-400"
                  : weeklyPercentage >= 50
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {weeklyPercentage >= 100
                ? "Weekly Goal Met!"
                : weeklyPercentage >= 75
                ? "On Track!"
                : weeklyPercentage >= 50
                ? "Steady Progress"
                : "Push Forward!"}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div
        className={`p-6 rounded-2xl ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        <h3
          className={`text-xl font-semibold mb-6 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          This Week's Activity
        </h3>

        <div className="grid grid-cols-7 gap-4">
          {weeklyProgress.map((day, index) => (
            <div key={index} className="text-center">
              <div
                className={`text-sm font-medium mb-3 ${
                  day.isToday
                    ? "text-brand-cyan"
                    : darkMode
                    ? "text-gray-300"
                    : "text-gray-600"
                }`}
              >
                {getDayName(day.date)}
              </div>

              <CircularProgress
                percentage={day.percentage}
                size={60}
                strokeWidth={6}
                color={
                  day.percentage >= 100
                    ? "#22c55e"
                    : day.percentage >= 75
                    ? "#10b981"
                    : day.percentage >= 50
                    ? "#eab308"
                    : day.percentage > 0
                    ? "#f97316"
                    : "#ef4444"
                }
                backgroundColor={darkMode ? "#374151" : "#e5e7eb"}
              >
                <div
                  className={`text-xs font-semibold ${
                    day.isToday
                      ? "text-brand-cyan"
                      : darkMode
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  {Math.round(day.percentage)}%
                </div>
              </CircularProgress>

              <div
                className={`text-xs mt-2 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {formatTime(day.minutes)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Information */}
      <div
        className={`p-6 rounded-2xl ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        <h3
          className={`text-xl font-semibold mb-4 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Your Goals
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`p-4 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <div
              className={`text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Daily Goal
            </div>
            <div
              className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {formatTime(userGoals.daily_goal_minutes)}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <div
              className={`text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Weekly Goal
            </div>
            <div
              className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {formatTime(userGoals.weekly_goal_minutes)}
            </div>
          </div>
        </div>

        <div
          className={`mt-4 text-sm ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Goals are set by your healthcare provider to support your therapy
          progress.
        </div>
      </div>
    </div>
  );
};

export default Statistics;
