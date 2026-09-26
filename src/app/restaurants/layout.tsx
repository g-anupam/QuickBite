"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserCircle2, LogOut } from "lucide-react";

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      // Full page load so no logged-in pages stay in the client router cache
      window.location.assign("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 bg-white border-b border-orange-100 shadow-sm sticky top-0 z-50">
        {/* Left: Logo */}
        <Link
          href="/restaurants"
          className="text-2xl font-extrabold text-orange-600 tracking-tight hover:text-orange-700 transition"
        >
          QuickBite
        </Link>

        {/* Middle: Nav links */}
        <div className="hidden sm:flex space-x-8">
          <Link
            href="/restaurants"
            className={`font-medium ${
              pathname === "/restaurants"
                ? "text-orange-600"
                : "text-gray-700 hover:text-orange-600"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/restaurants/menu"
            className={`font-medium ${
              pathname.startsWith("/restaurants/menu")
                ? "text-orange-600"
                : "text-gray-700 hover:text-orange-600"
            }`}
          >
            Menu
          </Link>

          <Link
            href="/restaurants/orders"
            className={`font-medium ${
              pathname.startsWith("/restaurants/orders")
                ? "text-orange-600"
                : "text-gray-700 hover:text-orange-600"
            }`}
          >
            Orders
          </Link>

          <Link
            href="/restaurants/coupons"
            className={`font-medium ${
              pathname.startsWith("/restaurants/orders")
                ? "text-orange-600"
                : "text-gray-700 hover:text-orange-600"
            }`}
          >
            Coupons
          </Link>
        </div>

        {/* Right: Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-orange-100 transition"
            aria-label="Profile"
          >
            <UserCircle2 className="h-7 w-7 text-gray-700 hover:text-orange-600" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 bg-white shadow-lg border border-orange-100 rounded-xl py-2 w-40">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition text-left"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="p-8">{children}</main>
    </div>
  );
}
