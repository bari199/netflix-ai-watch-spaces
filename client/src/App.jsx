import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

import AdminRoute from "./components/admin/AdminRoute.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import TitleListPage from "./pages/admin/TitleListPage.jsx";
import CreateTitlePage from "./pages/admin/CreateTitlePage.jsx";
import EditTitlePage from "./pages/admin/EditTitlePage.jsx";

import WatchSpacesPage from "./pages/watchspace/WatchSpacesPage.jsx";
import WatchPageDetails from "./pages/watchspace/watchPageDetails.jsx";
import CreateWatchSpacePage from "./pages/watchspace/CreateWatchSpacePage.jsx";

import RecommendedForYou from "./components/titles/RecommendedForYou.jsx";
import UpcomingWatchSpaces from "./components/watchspace/UpcomingWatchSpaces.jsx";
import QuickRejoinRooms from "./components/watchspace/QuickRejoinRooms";


import Navbar from "./components/layout/Navbar.jsx";
import MyProfilePage from "./pages/MyProfilePage.jsx";
import HeroSection from "./components/layout/HeroSection.jsx";
import Footer from "./components/layout/Footer.jsx";

function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090b] text-white">
      <Navbar />

      <HeroSection />

      {user && (
        <div className="relative z-10 mx-auto -mt-4 max-w-[1440px] space-y-12 px-5 pb-20 sm:px-8 lg:px-12">
          <section>
            <QuickRejoinRooms />
          </section>

          <section>
            <UpcomingWatchSpaces />
          </section>

          <section>
            <RecommendedForYou />
          </section>
        </div>
      )}

      <section>
        <Footer />
      </section>
    </main>
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

      {/* Profile */}
      <Route
        path="/profile"
        element={user ? <MyProfilePage /> : <Navigate to="/login" replace />}
      />

      {/* Watch Spaces */}
      <Route path="/watch-spaces" element={<WatchSpacesPage />} />
      <Route path="/watch-spaces/create" element={<CreateWatchSpacePage />} />
      <Route
        path="/watch-spaces/:watchSpaceId"
        element={<WatchPageDetails />}
      />

      {/* Authentication */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Password Reset */}
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />

      {/* Admin */}
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
