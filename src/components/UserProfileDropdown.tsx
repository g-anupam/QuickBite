"use client";

import { useState } from "react";
import { MapPin, LogOut, UserCircle2 } from "lucide-react";
import Link from "next/link";

export default function UserProfileDropdown() {
  const [open, setOpen] = useState(false);

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      // Full page load so no logged-in pages stay in the client router cache
      window.location.assign("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="relative">
      {/* Profile Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-orange-100 transition"
      >
        <UserCircle2 className="h-7 w-7 text-gray-700 hover:text-orange-600" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 bg-white shadow-lg border border-orange-100 rounded-xl py-2 w-44 z-50">
          <Link
            href="/users/addresses"
            onClick={() => setOpen(false)}
            className="flex items-center w-full px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Saved Addresses
          </Link>

          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 hover:bg-orange-50 text-left text-gray-700 hover:text-orange-600 transition"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
