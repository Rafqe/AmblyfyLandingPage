import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";
import Calendar from "./Calendar";

interface PatientCalendarViewProps {
  user: User | null;
  darkMode: boolean;
}

interface Patient {
  user_id: string;
  name: string;
  surname: string;
  email: string;
}

// Cache for patient data to avoid refetching
const patientsCache = new Map<string, { data: Patient[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const PatientCalendarView: React.FC<PatientCalendarViewProps> = ({
  user,
  darkMode,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarKey, setCalendarKey] = useState(0);

  // Optimized fetch function with caching and single query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPatients = useCallback(async () => {
    if (!user) return;

    // Check cache first
    const cacheKey = user.id;
    const cached = patientsCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setPatients(cached.data);
      if (cached.data.length > 0 && !selectedPatient) {
        setSelectedPatient(cached.data[0]);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get patient IDs for this doctor
      const { data: accessData, error: accessError } = await supabase
        .from("doctor_user_access")
        .select("patient_id")
        .eq("doctor_id", user.id);

      if (accessError) throw accessError;

      if (!accessData || accessData.length === 0) {
        setPatients([]);
        // Cache empty result
        patientsCache.set(cacheKey, {
          data: [],
          timestamp: now,
        });
        return;
      }

      const patientIds = accessData.map((access) => access.patient_id);

      // Fetch user data for these patients
      const { data: patientsData, error } = await supabase
        .from("user_data")
        .select(
          `
          user_id,
          name,
          surname,
          email
        `
        )
        .in("user_id", patientIds);

      if (error) throw error;

      const transformedPatients: Patient[] =
        patientsData?.map((patient: any) => ({
          user_id: patient.user_id,
          name: patient.name || "",
          surname: patient.surname || "",
          email: patient.email || "",
        })) || [];

      // Cache the results
      patientsCache.set(cacheKey, {
        data: transformedPatients,
        timestamp: now,
      });

      setPatients(transformedPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user]); // selectedPatient intentionally excluded to prevent re-fetch loops

  // Auto-select first patient when patients list changes
  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }
  }, [patients, selectedPatient]);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  // Handle patient selection change
  /* eslint-disable react-hooks/exhaustive-deps */
  const handlePatientChange = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.user_id === patientId);
      setSelectedPatient(patient || null);
      // Force calendar to remount with new key to prevent flickering
      setCalendarKey((prev) => prev + 1);
    },
    [patients] // selectedPatient intentionally excluded to avoid infinite loops
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  // Memoize patientAsUser to prevent unnecessary re-renders
  const patientAsUser = useMemo(() => {
    if (!selectedPatient || !user) return null;

    return {
      ...user,
      id: selectedPatient.user_id,
      email: selectedPatient.email,
    };
  }, [selectedPatient, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <h2
          className={`text-2xl font-bold mb-4 ${
            darkMode ? "text-white" : "text-brand-dark-blue"
          }`}
        >
          Patient Calendar View
        </h2>
        <p
          className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          No patients assigned to you yet.
        </p>
        <p
          className={`text-sm mt-2 ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Visit the Patients tab to add patients to your care.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Selector */}
      <div className="text-center">
        <h2
          className={`text-3xl font-bold mb-4 ${
            darkMode ? "text-white" : "text-brand-dark-blue"
          }`}
        >
          Patient Calendar View
        </h2>
        <div className="flex justify-center">
          <div className="relative">
            <select
              value={selectedPatient?.user_id || ""}
              onChange={(e) => handlePatientChange(e.target.value)}
              className={`px-4 py-2 rounded-lg border-2 focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">Select a patient...</option>
              {patients.map((patient) => (
                <option key={patient.user_id} value={patient.user_id}>
                  {patient.name && patient.surname
                    ? `${patient.name} ${patient.surname} (${patient.email})`
                    : patient.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {selectedPatient && patientAsUser && (
        <div>
          <div className="text-center mb-4">
            <h3
              className={`text-xl font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Calendar for{" "}
              {selectedPatient.name && selectedPatient.surname
                ? `${selectedPatient.name} ${selectedPatient.surname}`
                : selectedPatient.email}
            </h3>
          </div>
          <Calendar
            key={calendarKey}
            user={patientAsUser}
            darkMode={darkMode}
          />
        </div>
      )}
    </div>
  );
};

export default PatientCalendarView;
