import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";
import { User } from "@supabase/supabase-js";

interface DoctorInvitationsProps {
  user: User | null;
  darkMode: boolean;
}

interface PendingInvitation {
  invitation_id: string;
  doctor_name: string;
  doctor_email: string;
  message: string;
  created_at: string;
}

interface Doctor {
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  connected_since: string;
  info: string;
}

const DoctorInvitations: React.FC<DoctorInvitationsProps> = ({
  user,
  darkMode,
}) => {
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [connectedDoctors, setConnectedDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const fetchInvitations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } =
        await supabase.rpc("get_my_pending_invitations");

      if (invitationsError) throw invitationsError;

      setPendingInvitations(invitationsData || []);

      // Fetch connected doctors
      const { data: doctorsData, error: doctorsError } = await supabase.rpc(
        "get_my_doctors"
      );

      if (doctorsError) throw doctorsError;

      setConnectedDoctors(doctorsData || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setStatus("Error loading invitations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user, fetchInvitations]);

  const respondToInvitation = async (
    invitationId: string,
    response: "accepted" | "declined"
  ) => {
    if (!user) return;

    try {
      setResponding(invitationId);
      setStatus("");

      const { data, error } = await supabase.rpc("respond_to_invitation", {
        invitation_id_param: invitationId,
        response_param: response,
      });

      if (error) throw error;

      if (data.success) {
        setStatus(data.message);
        await fetchInvitations(); // Refresh the lists
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error("Error responding to invitation:", error);
      setStatus(`Error: ${error.message || "Failed to respond to invitation"}`);
    } finally {
      setResponding(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConnectedSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl p-8 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span
            className={`text-lg ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Loading healthcare team...
          </span>
        </div>
      </div>
    );
  }

  // Only show if there are pending invitations or connected doctors
  if (pendingInvitations.length === 0 && connectedDoctors.length === 0) {
    return (
      <div
        className={`rounded-xl p-8 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg border-2 border-dashed ${
          darkMode ? "border-gray-600" : "border-gray-300"
        }`}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🩺</div>
          <h3
            className={`text-xl font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            No Healthcare Team Yet
          </h3>
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            When doctors invite you to their practice, they'll appear here to
            help monitor your therapy progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Healthcare Team Container */}
      <div
        className={`rounded-xl p-8 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg border-l-4 border-blue-500`}
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">👨‍⚕️</span>
            </div>
            <div>
              <h3
                className={`text-3xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Your Healthcare Team
              </h3>
              <p
                className={`text-base mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {connectedDoctors.length > 0
                  ? `${connectedDoctors.length} doctor${
                      connectedDoctors.length !== 1 ? "s" : ""
                    } monitoring your progress`
                  : "No doctors connected yet"}
              </p>
            </div>
          </div>
        </div>

        {/* Connected Doctors - Clean Layout */}
        {connectedDoctors.length > 0 && (
          <div className="mb-8">
            <div className="space-y-4">
              {connectedDoctors.map((doctor) => (
                <div
                  key={doctor.doctor_id}
                  className={`group p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                    darkMode
                      ? "bg-gradient-to-r from-gray-700 to-gray-750 border-gray-600 hover:border-blue-500"
                      : "bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Doctor info */}
                    <div className="flex-1">
                      <h4
                        className={`font-bold text-2xl mb-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Dr. {doctor.doctor_name}
                      </h4>

                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">📅</span>
                            <p
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              Connected since{" "}
                              {formatConnectedSince(doctor.connected_since)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🩺</span>
                            <p
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              Healthcare Provider
                            </p>
                          </div>
                        </div>

                        {/* Professional Information */}
                        {doctor.info && doctor.info.trim() && (
                          <div className="flex items-start space-x-2 pt-2 border-t border-opacity-20 border-gray-400">
                            <span className="text-lg mt-0.5">🏥</span>
                            <div>
                              <p
                                className={`text-sm font-medium mb-1 ${
                                  darkMode ? "text-gray-300" : "text-gray-600"
                                }`}
                              >
                                Professional Information:
                              </p>
                              <p
                                className={`text-sm leading-relaxed ${
                                  darkMode ? "text-gray-400" : "text-gray-700"
                                }`}
                              >
                                {doctor.info}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <>
            <div
              className={`border-t-2 pt-8 ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">✉️</span>
                </div>
                <div>
                  <h4
                    className={`text-2xl font-bold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Pending Invitations ({pendingInvitations.length})
                  </h4>
                  <p
                    className={`text-base ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    New doctors requesting to join your healthcare team
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.invitation_id}
                    className={`p-6 rounded-xl border-2 border-dashed transition-all duration-300 hover:shadow-lg ${
                      darkMode
                        ? "bg-gradient-to-r from-gray-700 to-gray-750 border-yellow-600 hover:border-yellow-500"
                        : "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 hover:border-yellow-400"
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-6 xl:space-y-0">
                      {/* Invitation Info */}
                      <div className="flex-1">
                        <h5
                          className={`font-bold text-2xl mb-1 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Dr. {invitation.doctor_name}
                        </h5>
                        <p
                          className={`text-sm mb-3 ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Invited on {formatDate(invitation.created_at)}
                        </p>

                        {invitation.message && (
                          <div
                            className={`p-4 rounded-lg ${
                              darkMode
                                ? "bg-gray-600 border border-gray-500"
                                : "bg-white border border-gray-200"
                            } shadow-sm`}
                          >
                            <p
                              className={`text-base ${
                                darkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              <span className="font-semibold">Message:</span>{" "}
                              {invitation.message}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-4 xl:ml-6">
                        <button
                          onClick={() =>
                            respondToInvitation(
                              invitation.invitation_id,
                              "accepted"
                            )
                          }
                          disabled={responding === invitation.invitation_id}
                          className="flex-1 xl:flex-none px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {responding === invitation.invitation_id ? (
                            <span className="flex items-center space-x-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Accepting...</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-3">
                              <span className="text-lg">✓</span>
                              <span>Accept</span>
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() =>
                            respondToInvitation(
                              invitation.invitation_id,
                              "declined"
                            )
                          }
                          disabled={responding === invitation.invitation_id}
                          className="flex-1 xl:flex-none px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {responding === invitation.invitation_id ? (
                            <span className="flex items-center space-x-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Declining...</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-3">
                              <span className="text-lg">✗</span>
                              <span>Decline</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Help section for empty state when no doctors but layout is shown */}
        {connectedDoctors.length === 0 && pendingInvitations.length === 0 && (
          <div
            className={`text-center py-12 border-t-2 ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="text-6xl mb-4">🤝</div>
            <h4
              className={`text-xl font-semibold mb-3 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Ready to Connect with Healthcare Providers
            </h4>
            <p
              className={`text-base leading-relaxed ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Doctors can monitor your therapy progress and help set
              personalized goals.
              <br />
              Ask your healthcare provider about joining your digital therapy
              team.
            </p>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {status && (
        <div
          className={`p-5 rounded-xl text-base font-semibold border shadow-lg ${
            status.includes("success") ||
            status.includes("accepted") ||
            status.includes("declined")
              ? darkMode
                ? "bg-green-900 text-green-300 border-green-700"
                : "bg-green-50 text-green-800 border-green-200"
              : darkMode
              ? "bg-red-900 text-red-300 border-red-700"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {status.includes("success") ||
              status.includes("accepted") ||
              status.includes("declined")
                ? "✅"
                : "❌"}
            </span>
            <span>{status}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorInvitations;
