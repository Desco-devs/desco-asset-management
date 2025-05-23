import HeaderHolder from "./components/custom-reuseable/landing-page/header/HeaderHolder";
import LandingPageHolder from "./components/custom-reuseable/landing-page/LandingPageHolder";

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full bg-green-200/10">
      {/* Green gradient overlay */}
      <div
        className="absolute inset-0 h-full w-full bg-gradient-to-tr from-white/30 from-0% via-green-200/30 via-80% to-white/20 to-100% pointer-events-none z-0
      dark:from-chart-3/30 dark:from-30% dark:via-green-200/30 dark:via-75% dark:to-chart-3/20 dark:to-120%"
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <HeaderHolder />
        {/* <LoginForm /> */}
        <LandingPageHolder />
      </div>
    </div>
  );
}
