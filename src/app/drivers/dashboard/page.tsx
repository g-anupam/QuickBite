"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// ------------------ STAT CARD ------------------
const StatCard = ({ label, value, icon }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border border-gray-100"
  >
    <div className="text-4xl mb-2">{icon}</div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm font-medium text-gray-500 mt-1">{label}</div>
  </motion.div>
);

// ------------------ DRIVER NAVBAR ------------------
const DriverNavbar = () => {
  const [open, setOpen] = useState(false);

  const logout = async () => {
    setOpen(false);
    await fetch("/api/logout", { method: "POST" });
    // Full page load so no logged-in pages stay in the client router cache
    window.location.assign("/");
  };

  return (
    <nav className="sticky top-0 z-20 bg-gray-800 p-4 shadow-lg">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <Link
          href="/drivers/dashboard"
          className="text-2xl font-extrabold text-orange-500"
        >
          QuickBite Driver
        </Link>

        <div className="flex items-center space-x-6">
          <Link href="/drivers/dashboard" className="text-white">
            Dashboard
          </Link>

          {/* Removed Online/Offline button entirely */}

          <div className="relative">
            <span
              onClick={() => setOpen(!open)}
              className="cursor-pointer text-white text-xl"
            >
              👤
            </span>

            {open && (
              <div className="absolute right-0 mt-3 bg-white w-40 rounded-lg shadow-lg p-2">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 hover:bg-red-100 rounded"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// ------------------ MAIN PAGE ------------------
export default function DriverDashboard() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  // ------------------ REAL METRICS ------------------
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [earningsToday, setEarningsToday] = useState(0);

  async function loadDriverStats() {
    try {
      //  Fetch how many orders this driver delivered today
      const res1 = await fetch("/api/driver/deliveries-today");
      //console.log(res1);
      const d1 = await res1.json();
      setDeliveriesToday(d1.deliveriesToday ?? 0);

      //  Fetch today’s earnings (already implemented)
      const res2 = await fetch("/api/driver/earnings");
      const d2 = await res2.json();
      setEarningsToday(d2.today ?? 0);
    } catch (err) {
      console.error("Driver stats fetch error:", err);
    }
  }

  // ------------------ ORDERS ------------------
  async function loadAvailableOrders() {
    try {
      const res = await fetch("/api/driver/available-orders");
      const data = await res.json();
      setAvailableOrders(data);
    } catch (err) {
      console.error("Driver orders fetch error:", err);
    }
  }

  async function loadOrderDetails(orderId: number) {
    const res = await fetch(`/api/driver/order/${orderId}`);
    const data = await res.json();
    setCurrentOrder(data);
  }

  async function acceptOrder(orderId: number) {
    await fetch("/api/driver/accept-order", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });

    await loadOrderDetails(orderId);
    await loadAvailableOrders();
    await loadDriverStats();
  }

  async function markDelivered(orderId: number) {
    await fetch("/api/driver/deliver-order", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });

    setCurrentOrder(null);
    await loadAvailableOrders();
    await loadDriverStats();
  }

  useEffect(() => {
    loadAvailableOrders();
    loadDriverStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar />

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN — REAL METRICS */}
        <div className="space-y-6">
          <StatCard
            label="Deliveries Today"
            value={deliveriesToday}
            icon="📦"
          />
          <StatCard
            label="Earnings Today"
            value={`₹${earningsToday}`}
            icon="💰"
          />
          <StatCard label="Active Time" value="36 min" icon="⏱️" />
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* CURRENT ORDER */}
          {currentOrder ? (
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold mb-2">
                Current Delivery — Order #{currentOrder.order.Order_ID}
              </h2>

              <p className="text-gray-700">
                <strong>Restaurant:</strong>{" "}
                {currentOrder.restaurant.Restaurant_Name}
              </p>

              <p className="text-gray-700">
                <strong>Pickup:</strong>{" "}
                {currentOrder.restaurant.Address_First_line},{" "}
                {currentOrder.restaurant.City}
              </p>

              <p className="text-gray-700 mt-3">
                <strong>Delivery Address:</strong>
                <br />
                {currentOrder.address.Address_First_Line}
                {currentOrder.address.Address_Second_Line
                  ? `, ${currentOrder.address.Address_Second_Line}`
                  : ""}
                <br />
                {currentOrder.address.City} - {currentOrder.address.Pincode}
              </p>

              <h3 className="font-semibold mt-4">Items:</h3>
              <ul className="text-gray-700">
                {currentOrder.items.map((it: any) => (
                  <li key={it.Menu_ID}>
                    {it.Item_Name} x {it.Quantity} — ₹{it.Price}
                  </li>
                ))}
              </ul>

              <p className="mt-4 font-bold text-gray-900">
                Total: ₹{Number(currentOrder.payment.Amount).toFixed(2)}
              </p>

              {currentOrder.payment.Payment_Method === "COD" && (
                <p className="mt-2 text-red-600 font-semibold">
                  Collect Cash on Delivery: ₹
                  {Number(currentOrder.payment.Amount).toFixed(2)}
                </p>
              )}

              <button
                onClick={() => markDelivered(currentOrder.order.Order_ID)}
                className="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Mark as Delivered
              </button>
            </div>
          ) : (
            <>
              {/* NEW ORDERS AVAILABLE */}
              <h2 className="text-2xl font-bold text-black">
                New Orders Available
              </h2>

              <div className="space-y-4">
                {availableOrders.length === 0 ? (
                  <p className="text-gray-500">
                    No orders available right now.
                  </p>
                ) : (
                  availableOrders.map((o: any) => (
                    <div
                      key={o.Order_ID}
                      className="bg-white p-4 shadow rounded-xl border"
                    >
                      <h3 className="font-semibold text-lg text-black">
                        Order #{o.Order_ID}
                      </h3>

                      <p className="text-gray-700">
                        <strong>Restaurant:</strong> {o.Restaurant_Name}
                      </p>

                      <p className="text-gray-700">
                        <strong>Pickup:</strong> {o.Restaurant_Address1},{" "}
                        {o.Restaurant_City}
                      </p>

                      <p className="text-gray-700">
                        <strong>Delivery:</strong> {o.Delivery_Address1},{" "}
                        {o.Delivery_City}
                      </p>

                      <button
                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
                        onClick={() => acceptOrder(o.Order_ID)}
                      >
                        Accept Order
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
