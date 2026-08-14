import { Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Images } from "./pages/Images";
import { ImageDetail } from "./pages/ImageDetail";
import { Vulnerabilities } from "./pages/Vulnerabilities";
import { Scans } from "./pages/Scans";
import { ScanDetail } from "./pages/ScanDetail";
import { Reports } from "./pages/Reports";
import { ReportDetail } from "./pages/ReportDetail";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/images"
        element={
          <ProtectedRoute>
            <Images />
          </ProtectedRoute>
        }
      />
      <Route
        path="/images/:id"
        element={
          <ProtectedRoute>
            <ImageDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vulnerabilities"
        element={
          <ProtectedRoute>
            <Vulnerabilities />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scans"
        element={
          <ProtectedRoute>
            <Scans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scans/:id"
        element={
          <ProtectedRoute>
            <ScanDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
