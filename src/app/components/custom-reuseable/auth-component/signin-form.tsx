"use client";

import { SignInForm } from "@/components/auth";
import { SignInProps } from "@/types/auth";

const SigninWrapper = ({ onToggle, onForgotPassword }: SignInProps) => {
  return <SignInForm onToggle={onToggle} onForgotPassword={onForgotPassword} />;
};

export default SigninWrapper;
