// app/service/auth/authentication.tsx
import { User } from "@/app/context/AuthContext";
import { NextResponse } from "next/server";

export async function login({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  try {
    const res = await fetch("/api/authentication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data.user as User;
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(error.message || "Login failed");
  }
}

export async function checkSession(
  setUser: (user: User | null) => void,
  clearUser: () => void
) {
  try {
    const res = await fetch("/api/session", {
      cache: "no-store",
      credentials: "include", // Important for cookies to be sent
    });

    if (res.ok) {
      const { user } = (await res.json()) as { user: User };
      setUser(user);
      return user;
    } else {
      clearUser();
      return null;
    }
  } catch (error) {
    console.error("Session check error:", error);
    clearUser();
    return null;
  }
}

export async function logout() {
  try {
    const res = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
