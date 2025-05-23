import HeaderHolder from "./components/custom-reuseable/landing-page/header/HeaderHolder";
import LandingPageHolder from "./components/custom-reuseable/landing-page/LandingPageHolder";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <HeaderHolder />
      {/* <LoginForm /> */}
      <LandingPageHolder />
    </div>
  );
}
