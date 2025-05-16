import Image from "next/image";

import { ToastContainer } from "react-toastify";
import LoginForm from "./auth/login/page";

export default function Home() {
  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <LoginForm />
    </>
  );
}
