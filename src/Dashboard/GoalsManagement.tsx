import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

interface GoalsManagementProps {
  user: User | null;
  darkMode: boolean;
}

interface Patient {
  user_id: string;
  name: string;
  surname: string;
  email: string;
  current_daily_goal: number;
  current_weekly_goal: number;
}

interface GoalUpdateForm {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
}

const GoalsManagement: React.FC<GoalsManagementProps> = ({
  user,
  darkMode,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [goalForm, setGoalForm] = useState<GoalUpdateForm>({
    daily_goal_minutes: 240,
    weekly_goal_minutes: 1680,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch patients assigned to this doctor
      const { data: patientsData, error } = await supabase
        .from("user_data")
        .select(
          `
          user_id,
          name,
          surname,
          users!inner(email),
          user_goals(daily_goal_minutes, weekly_goal_minutes)
        `
        )
        .eq("doctor_id", user.id);

      if (error) throw error;

      // Transform the data to match our Patient interface
      const transformedPatients =
        patientsData?.map((patient: any) => ({
          user_id: patient.user_id,
          name: patient.name || "",
          surname: patient.surname || "",
          email: patient.users?.email || "",
          current_daily_goal:
            patient.user_goals?.[0]?.daily_goal_minutes || 240,
          current_weekly_goal:
            patient.user_goals?.[0]?.weekly_goal_minutes || 1680,
        })) || [];

      setPatients(transformedPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setStatus("Error loading patients");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setGoalForm({
      daily_goal_minutes: patient.current_daily_goal,
      weekly_goal_minutes: patient.current_weekly_goal,
    });
    setStatus("");
  };

  const handleGoalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !user) return;

    try {
      setUpdating(true);
      setStatus("");

      // Update or insert user goals
      const { error } = await supabase.from("user_goals").upsert(
        {
          user_id: selectedPatient.user_id,
          daily_goal_minutes: goalForm.daily_goal_minutes,
          weekly_goal_minutes: goalForm.weekly_goal_minutes,
          set_by_doctor_id: user.id,
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) throw error;

      setStatus("Goals updated successfully!");

      // Update the patient in our local state
      setPatients(
        patients.map((patient) =>
          patient.user_id === selectedPatient.user_id
            ? {
                ...patient,
                current_daily_goal: goalForm.daily_goal_minutes,
                current_weekly_goal: goalForm.weekly_goal_minutes,
              }
            : patient
        )
      );

      // Update selected patient
      setSelectedPatient({
        ...selectedPatient,
        current_daily_goal: goalForm.daily_goal_minutes,
        current_weekly_goal: goalForm.weekly_goal_minutes,
      });
    } catch (error) {
      console.error("Error updating goals:", error);
      setStatus("Failed to update goals. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2
          className={`text-3xl font-bold mb-2 ${
            darkMode ? "text-white" : "text-brand-dark-blue"
          }`}
        >
          Patient Goals Management
        </h2>
        <p
          className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Set and manage therapy goals for your patients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient List */}
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
            Your Patients ({patients.length})
          </h3>

          {patients.length === 0 ? (
            <div
              className={`text-center py-8 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <p>No patients assigned to you yet.</p>
              <p className="text-sm mt-2">
                Patients will appear here when they are assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div
                  key={patient.user_id}
                  onClick={() => handlePatientSelect(patient)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedPatient?.user_id === patient.user_id
                      ? darkMode
                        ? "bg-blue-900 border-blue-400"
                        : "bg-blue-50 border-blue-300"
                      : darkMode
                      ? "bg-gray-700 hover:bg-gray-600 border-gray-600"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                  } border-2`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4
                        className={`font-semibold ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {patient.name && patient.surname
                          ? `${patient.name} ${patient.surname}`
                          : "Unnamed Patient"}
                      </h4>
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {patient.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Current Goals
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Daily: {formatTime(patient.current_daily_goal)}
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Weekly: {formatTime(patient.current_weekly_goal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Setting Form */}
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
            Set Goals
          </h3>

          {selectedPatient ? (
            <div>
              <div
                className={`mb-6 p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <h4
                  className={`font-semibold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Selected Patient:
                </h4>
                <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  {selectedPatient.name && selectedPatient.surname
                    ? `${selectedPatient.name} ${selectedPatient.surname}`
                    : "Unnamed Patient"}
                </p>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {selectedPatient.email}
                </p>
              </div>

              <form onSubmit={handleGoalUpdate} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Daily Goal (minutes)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={goalForm.daily_goal_minutes}
                      onChange={(e) =>
                        setGoalForm({
                          ...goalForm,
                          daily_goal_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    <span
                      className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ({formatTime(goalForm.daily_goal_minutes)})
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Weekly Goal (minutes)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10080"
                      value={goalForm.weekly_goal_minutes}
                      onChange={(e) =>
                        setGoalForm({
                          ...goalForm,
                          weekly_goal_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    <span
                      className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ({formatTime(goalForm.weekly_goal_minutes)})
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setGoalForm({
                        daily_goal_minutes: 240,
                        weekly_goal_minutes: 1680,
                      })
                    }
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      darkMode
                        ? "bg-gray-600 text-white hover:bg-gray-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Default (4h/28h)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGoalForm({
                        daily_goal_minutes: 180,
                        weekly_goal_minutes: 1260,
                      })
                    }
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      darkMode
                        ? "bg-gray-600 text-white hover:bg-gray-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Light (3h/21h)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGoalForm({
                        daily_goal_minutes: 300,
                        weekly_goal_minutes: 2100,
                      })
                    }
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      darkMode
                        ? "bg-gray-600 text-white hover:bg-gray-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Intensive (5h/35h)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-gradient-to-r from-brand-dark-blue to-brand-cyan text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform-gpu hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Updating Goals..." : "Update Goals"}
                </button>

                {status && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium ${
                      status.includes("success")
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
          ) : (
            <div
              className={`text-center py-8 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <p>Select a patient from the list to set their goals.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {patients.length > 0 && (
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
            Quick Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {patients.length}
              </div>
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Patients
              </div>
            </div>
            <div
              className={`p-4 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {formatTime(
                  Math.round(
                    patients.reduce((sum, p) => sum + p.current_daily_goal, 0) /
                      patients.length
                  )
                )}
              </div>
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Avg Daily Goal
              </div>
            </div>
            <div
              className={`p-4 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {formatTime(
                  Math.round(
                    patients.reduce(
                      (sum, p) => sum + p.current_weekly_goal,
                      0
                    ) / patients.length
                  )
                )}
              </div>
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Avg Weekly Goal
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsManagement;
