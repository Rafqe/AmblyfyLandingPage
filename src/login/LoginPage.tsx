import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://temkhtebkbcidecterqz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbWtodGVia2JjaWRlY3RlcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MzQwMDYsImV4cCI6MjA2NDUxMDAwNn0.6lK1CuirhFNRB-RVwMc-QPwirWlPUlNEbCjTPOg7B7E"
);

type AccountType = "user" | "doctor" | "admin";

interface RegisterForm {
  name: string;
  surname: string;
  email: string;
  password: string;
  account_type: AccountType;
}

interface LoginForm {
  email: string;
  password: string;
}

const initialRegState: RegisterForm = {
  name: "",
  surname: "",
  email: "",
  password: "",
  account_type: "user",
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

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegStatus("");
    try {
      // 1. Register user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: regForm.email,
        password: regForm.password,
      });
      if (error) throw error;
      // 2. Insert user data into user_data table
      const { error: dbError } = await supabase.from("user_data").insert([
        {
          user_id: data.user?.id || data.session?.user?.id,
          name: regForm.name,
          surname: regForm.surname,
          account_type: regForm.account_type,
        },
      ]);
      if (dbError) throw dbError;
      setRegStatus(
        "Registration successful! Please check your email to confirm your account."
      );
      setRegForm(initialRegState);
    } catch (err: any) {
      setRegStatus(`Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginStatus("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) throw error;
      setLoginStatus("Login successful!");
      setLoginForm(initialLoginState);
    } catch (err: any) {
      setLoginStatus(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "40px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px #eee",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>
        Amblyfy Login & Registration
      </h2>
      <form onSubmit={handleRegister} style={{ marginBottom: 32 }}>
        <h3>Register</h3>
        <input
          type="text"
          placeholder="Name"
          value={regForm.name}
          onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="text"
          placeholder="Surname"
          value={regForm.surname}
          onChange={(e) => setRegForm({ ...regForm, surname: e.target.value })}
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="email"
          placeholder="Email"
          value={regForm.email}
          onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={regForm.password}
          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <select
          value={regForm.account_type}
          onChange={(e) =>
            setRegForm({
              ...regForm,
              account_type: e.target.value as AccountType,
            })
          }
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        >
          <option value="user">User</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#144475",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontWeight: "bold",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
        {regStatus && (
          <div
            style={{
              marginTop: 8,
              color: regStatus.startsWith("Registration successful")
                ? "green"
                : "red",
            }}
          >
            {regStatus}
          </div>
        )}
      </form>
      <form onSubmit={handleLogin}>
        <h3>Login</h3>
        <input
          type="email"
          placeholder="Email"
          value={loginForm.email}
          onChange={(e) =>
            setLoginForm({ ...loginForm, email: e.target.value })
          }
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={loginForm.password}
          onChange={(e) =>
            setLoginForm({ ...loginForm, password: e.target.value })
          }
          required
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#00AEC2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontWeight: "bold",
          }}
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
        {loginStatus && (
          <div
            style={{
              marginTop: 8,
              color: loginStatus.startsWith("Login successful")
                ? "green"
                : "red",
            }}
          >
            {loginStatus}
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginPage;
