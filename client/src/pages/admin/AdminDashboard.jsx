import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-red-500">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Welcome, {user?.name || "Admin"}
        </h1>

        <p className="mt-2 text-gray-400">
          Manage your Netflix AI Watch Spaces content.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/titles"
          className="group rounded-xl border border-white/10 bg-[#1f1f1f] p-6 transition hover:border-red-600 hover:bg-[#252525]"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/20 text-2xl">
            🎬
          </div>

          <h2 className="text-xl font-semibold group-hover:text-red-500">
            Manage Titles
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Create, view, update and delete movies and video content.
          </p>

          <p className="mt-5 text-sm font-semibold text-red-500">
            Manage Content →
          </p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
