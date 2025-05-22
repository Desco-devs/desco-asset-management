"use client";

const GuradLoader = () => {
  return (
    <div className="h-screen bg-background">
      <div className="fixed inset-0 h-full w-full flex items-center justify-center dark:bg-chart-1/20 bg-chart-1/20 text-5xl">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-chart-1"></div>
      </div>
    </div>
  );
};

export default GuradLoader;
