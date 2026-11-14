import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Manage Titles", path: "/admin/titles" },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-white md:flex">
      <aside className="w-full border-b border-white/10 bg-[#101010] p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <h1 className="mb-8 text-2xl font-bold text-red-600">
          NETFLIX <span className="text-white">ADMIN</span>
        </h1>

        <nav className="flex gap-3 md:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-white/10 pt-5 md:mt-auto">
          <p className="mb-3 truncate text-sm text-gray-400">
            {user?.name || "Administrator"}
          </p>

          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-left text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
