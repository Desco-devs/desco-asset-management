const GuardLoader = () => {
  return (
    <div className="h-screen fixed inset-0  w-full flex items-center justify-center dark:bg-gray-900 dark:text-white bg-chart-5 text-gray-900 text-5xl">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default GuardLoader;
