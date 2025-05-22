"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { login } from "@/app/service/auth/authentication";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface SigninProps {
  onToggle: () => void;
  onForgotPassword: () => void;
}

const SigninWrapper = ({ onToggle, onForgotPassword }: SigninProps) => {
  const router = useRouter();
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (id === "password") {
      setTyping(true);
      setTimeout(() => setTyping(false), 1000); // Delays hiding dots when stopping typing
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({
        username: formData.username,
        password: formData.password,
      });
      setUser(user);
      toast.success("Login successful! Redirecting...");
      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4">
      <Card className="w-full max-w-md shadow-lg relative">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex flex-col items-center">
            <img className="h-16 mb-2" src="/images/logo.png" alt="logo" />
            <CardTitle className="text-xl font-semibold text-black">
              DESCO
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="ml-1 text-black">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-white border-black/30 text-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="ml-1 text-black">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={typing ? "text" : passwordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-white border-black/30 text-black pr-10"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-black"
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-chart-1 hover:bg-chart-2 text-white duration-300 ease-in-out transition-all mt-2"
            >
              {loading ? "Logging in..." : "LOGIN"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col justify-center w-full pt-4">
          <p className="text-center text-black text-sm">
            Don&apos;t have an account?{" "}
            <button
              onClick={onToggle}
              className="text-blue-500 hover:text-blue-600 font-thin cursor-pointer"
            >
              Sign up
            </button>
          </p>
          <p>
            <button
              onClick={onForgotPassword}
              className="text-blue-500 hover:text-blue-600 font-thin cursor-pointer"
            >
              Forgot password?
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SigninWrapper;
