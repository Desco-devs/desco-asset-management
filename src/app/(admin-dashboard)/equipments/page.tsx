import { Metadata } from "next";
import EquipmentsPageModern from "./components/EquipmentsPageModern";

export const metadata: Metadata = {
  title: "Equipment Management | Desco",
  description: "View and manage equipment across projects",
};

export default function EquipmentPage() {
  return <EquipmentsPageModern />;
}