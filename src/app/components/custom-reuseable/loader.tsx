"use client";

const GuradLoader = () => {
  return (
    <div className="h-screen bg-background">
      <div
        className="h-full w-full bg-gradient-to-tr from-white/30 from-0% via-green-200/30 via-80% to-white/20 to-100% pointer-events-none z-0
      dark:from-chart-3/30 dark:from-30% dark:via-green-200/30 dark:via-75% dark:to-chart-3/20 dark:to-120% flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 dark:border-white border-chart-2"></div>
      </div>
    </div>
  );
};

export default GuradLoader;
