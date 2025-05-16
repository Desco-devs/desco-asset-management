// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import { useAuth } from "@/app/context/AuthContext";
// import { login } from "@/app/service/auth/authentication";

// export default function LoginForm() {
//   const router = useRouter();
//   const { setUser } = useAuth();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const user = await login({ username, password });
//       setUser(user);
//       toast.success("Login successful! Redirecting...");
//       setTimeout(() => {
//         router.push("/home");
//       }, 1500);
//     } catch (err: any) {
//       toast.error(err.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
//       <form
//         onSubmit={handleSubmit}
//         className="max-w-md w-full bg-white p-8 rounded-lg shadow"
//       >
//         <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>

//         <label htmlFor="username" className="block text-sm font-medium mb-1">
//           Username
//         </label>
//         <input
//           id="username"
//           type="text"
//           placeholder="your username"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           required
//           className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />

//         <label htmlFor="password" className="block text-sm font-medium mb-1">
//           Password
//         </label>
//         <input
//           id="password"
//           type="password"
//           placeholder="Enter your password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />

//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors"
//         >
//           {loading ? "Logging in…" : "Login"}
//         </button>
//       </form>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import SigninWrapper from "@/app/components/custom-reuseable/auth-component/signin-form";
// import ForgotWrapper from "@/app/components/custom-reuseable/auth-component/forgot-password";

const carouselItems = [
  "/images/static/1a.jpg",
  "/images/static/2a.jpg",
  "/images/static/3a.jpg",
  "/images/static/4a.jpg",
  "/images/static/5a.jpg",
  "/images/static/6a.jpg",
];

const Auth = () => {
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);
  const [authMode, setAuthMode] = useState<"signin" | "forgot">("signin");

  const goToForgotPassword = () => {
    setAuthMode("forgot");
  };

  const goToSignIn = () => {
    setAuthMode("signin");
  };

  useEffect(() => {
    if (!api) return;

    // Set up auto-sliding
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  // Handle slide changes
  const handleSelect = () => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  };

  useEffect(() => {
    if (!api) return;

    api.on("select", handleSelect);

    return () => {
      api.off("select", handleSelect);
    };
  }, [api, handleSelect]);

  return (
    <div className="w-full h-screen flex flex-col md:flex-row dark:bg-gray-900 bg-gray-200">
      {/* Left: Fullscreen Carousel */}
      <div className="hidden md:block w-full h-full bg-muted relative overflow-hidden">
        <div
          className="absolute w-full h-full z-50 bg-gradient-to-r dark:from-gray-900/30 dark:via-gray-900/50
                 dark:to-gray-900 from-gray-200/10 via-gray-200/40 to-gray-200"
        ></div>
        <Carousel
          setApi={setApi}
          className="w-full h-full"
          opts={{
            loop: true,
            align: "center",
          }}
        >
          <CarouselContent className="h-screen w-full m-0">
            {carouselItems.map((item, index) => (
              <CarouselItem key={index} className="h-full w-full p-0">
                <div className="h-full w-full">
                  <Card className="h-full w-full rounded-none border-0 p-0">
                    <CardContent className="h-full w-full p-0 flex items-center justify-center">
                      {/* Full background image */}
                      <img
                        src={item}
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Right: Auth Section (Signin or Forgot Password) */}
      <div className="w-full h-full flex items-center justify-center">
        {authMode === "signin" ? (
          <SigninWrapper
            onForgotPassword={goToForgotPassword}
            onToggle={() => {}}
          />
        ) : (
          // <ForgotWrapper onToggle={goToSignIn} />
          <div></div>
        )}
      </div>
    </div>
  );
};

export default Auth;
