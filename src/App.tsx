// deno-lint-ignore-file
import type { ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/login.tsx";
import Register from "./components/register.tsx";
import TaskApp from "./TaskApp.tsx";
import Dashboard from "./components/dashboard.tsx"; // dashboard kullanıyorsan

type ProtectedProps = {
  children: ReactElement;
};

// Giriş yapılmamışsa login'e atan korumalı route
function ProtectedRoute({ children }: ProtectedProps) {
  const token = localStorage.getItem("accessToken"); // JWT burada tutuluyor

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const isAuthenticated = !!localStorage.getItem("accessToken");

  return (
    <BrowserRouter>
      <Routes>
        {/* köke gelenleri /tasks'e yönlendir */}
        <Route path="/" element={<Navigate to="/tasks" replace />} />

        {/* Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/tasks" replace /> : <Login />
          }
        />

        {/* Register */}
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/tasks" replace /> : <Register />
          }
        />

        {/* Tasks (korumalı) */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskApp />
            </ProtectedRoute>
          }
        />

        {/* Dashboard (korumalı, istersen kullan) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Bilinmeyen path → /tasks */}
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
