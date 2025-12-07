import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, User, LogOut, ChevronDown } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    // Sadece ekranda email göstermek için; /auth/me olmasa da zorunlu değil
    const storedEmail = localStorage.getItem("email");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  async function logout() {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Hata olsa da client tarafında logout yapacağız
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("email");

    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">
            TaskManager
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors hidden sm:flex">
            <Bell className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors hidden sm:flex">
            <Settings className="w-5 h-5 text-slate-600" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 pl-3 pr-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-900">
                  {email ? email.split("@")[0] : "User"}
                </div>
                <div className="text-xs text-slate-500">
                  {email || "user@example.com"}
                </div>
              </div>
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-medium text-slate-900">
                      {email ? email.split("@")[0] : "User"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {email || "user@example.com"}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
