"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, clearUser } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>User is not authenticated.</p>
      </div>
    );
  }
  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/authentication/logout", { method: "POST" });
      if (res.ok) {
        clearUser();
        toast.success("Logout successful!");
      } else {
        toast.error("Logout failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Logout error");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form className="max-w-md w-full bg-white p-8 rounded-lg shadow space-y-4">
        <h2 className="text-2xl font-semibold mb-6 text-center">Home</h2>

        <div>
          <label className="block font-medium">Full Name:</label>
          <p>{user.fullname}</p>
        </div>

        <div>
          <label className="block font-medium">Username:</label>
          <p>{user.username}</p>
        </div>

        <div>
          <label className="block font-medium">Phone:</label>
          <p>{user.phone ?? "N/A"}</p>
        </div>

        <div>
          <label className="block font-medium">Permissions:</label>
          <ul className="list-disc list-inside">
            {user.permissions.map((perm) => (
              <li key={perm}>{perm}</li>
            ))}
          </ul>
        </div>

        <div>
          <label className="block font-medium">Created At:</label>
          <p>{new Date(user.createdAt).toLocaleString()}</p>
        </div>

        <div>
          <label className="block font-medium">Updated At:</label>
          <p>{new Date(user.updatedAt).toLocaleString()}</p>
        </div>
        <div>
          <label className="block font-medium">STATUS</label>
          <p>{user.userStatus}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full mt-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </form>
    </div>
  );
}
