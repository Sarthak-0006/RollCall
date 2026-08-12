import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to={user ? (user.role === "teacher" ? "/teacher" : "/student") : "/"} className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-ink">RollCall</span>
          <span className="hidden sm:inline eyebrow">Attendance Register</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-ink leading-tight">{user.name}</p>
              <p className="text-xs text-ink-muted capitalize leading-tight">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-outline text-sm py-1.5">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
