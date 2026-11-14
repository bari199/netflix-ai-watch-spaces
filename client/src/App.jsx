import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import AdminRoute from "./components/admin/AdminRoute.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import TitleListPage from "./pages/admin/TitleListPage.jsx";
import CreateTitlePage from "./pages/admin/CreateTitlePage.jsx";
import EditTitlePage from "./pages/admin/EditTitlePage.jsx";
import WatchSpacesPage from "./pages/watchspace/WatchSpacesPage.jsx";
import WatchPageDetails from "./pages/watchspace/watchPageDetails.jsx";
import CreateWatchSpacePage from "./pages/watchspace/CreateWatchSpacePage.jsx";

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#141414] p-8 text-white">
      <h1 className="text-3xl font-bold text-red-600">
        Netflix AI Watch Spaces
      </h1>

      {user ? (
        <div className="mt-6">
          <p>Welcome, {user.name}</p>
          <button
            onClick={logout}
            className="mt-4 rounded bg-red-600 px-5 py-2"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => (window.location.href = "/login")}
          className="mt-6 rounded bg-red-600 px-5 py-2"
        >
          Sign In
        </button>
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414] text-white">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/watch-spaces" element={<WatchSpacesPage />} />
      <Route path="/watch-spaces/create" element={<CreateWatchSpacePage />} />
      <Route
        path="/watch-spaces/:watchSpaceId"
        element={<WatchPageDetails />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="titles" element={<TitleListPage />} />
          <Route path="titles/create" element={<CreateTitlePage />} />
          <Route path="titles/:titleId/edit" element={<EditTitlePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
