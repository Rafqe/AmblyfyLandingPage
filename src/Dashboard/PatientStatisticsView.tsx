import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";
import Statistics from "./Statistics";

interface PatientStatisticsViewProps {
  user: User | null;
  darkMode: boolean;
}

interface Patient {
  user_id: string;
  name: string;
  surname: string;
  email: string;
}

const PatientStatisticsView: React.FC<PatientStatisticsViewProps> = ({
  user,
  darkMode,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user) return;

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

      const transformedPatients =
        patientsData?.map((patient: any) => ({
          user_id: patient.user_id,
          name: patient.name || "",
          surname: patient.surname || "",
          email: patient.email || "",
        })) || [];

      setPatients(transformedPatients);

      // Auto-select first patient if none selected
      if (transformedPatients.length > 0 && !selectedPatient) {
        setSelectedPatient(transformedPatients[0]);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPatient]);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  // Create a mock user object for the selected patient
  const patientAsUser = selectedPatient
    ? {
        ...user!,
        id: selectedPatient.user_id,
        email: selectedPatient.email,
      }
    : null;

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
          Patient Statistics View
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
          Patient Statistics View
        </h2>
        <div className="flex justify-center">
          <div className="relative">
            <select
              value={selectedPatient?.user_id || ""}
              onChange={(e) => {
                const patient = patients.find(
                  (p) => p.user_id === e.target.value
                );
                setSelectedPatient(patient || null);
              }}
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

      {/* Statistics View */}
      {selectedPatient && patientAsUser && (
        <div>
          <div className="text-center mb-4">
            <h3
              className={`text-xl font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Statistics for{" "}
              {selectedPatient.name && selectedPatient.surname
                ? `${selectedPatient.name} ${selectedPatient.surname}`
                : selectedPatient.email}
            </h3>
          </div>
          <Statistics user={patientAsUser} darkMode={darkMode} />
        </div>
      )}
    </div>
  );
};

export default PatientStatisticsView;
