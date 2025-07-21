import { Suspense } from "react";
import ClientDashboard from "./ClientDashboard";

export default function Dashboard() {
  return (
    <Suspense>
      <ClientDashboard />
    </Suspense>
  );
}
