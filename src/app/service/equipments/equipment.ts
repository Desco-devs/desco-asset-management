import { Equipment, Status } from "../types";

const API_BASE = "/api/equipments";

export async function createEquipment(data: {
  brand: string;
  model: string;
  type: string;
  expirationDate: string;
  status: Status;
  remarks?: string | null;
  owner: string;
  projectId: string;
  inspectionDate?: Date;
  image: File;
}): Promise<Equipment> {
  const formData = new FormData();
  formData.append("brand", data.brand);
  formData.append("model", data.model);
  formData.append("type", data.type);
  formData.append("expirationDate", data.expirationDate);
  formData.append("status", data.status);
  if (data.remarks != null) formData.append("remarks", data.remarks);
  formData.append("owner", data.owner);
  formData.append("projectId", data.projectId);
  if (data.inspectionDate)
    formData.append("inspectionDate", data.inspectionDate.toISOString());
  formData.append("image", data.image);

  const res = await fetch(API_BASE, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to create equipment");
  }

  return (await res.json()) as Equipment;
}

export async function updateEquipment(
  uid: string,
  data: {
    brand: string;
    model: string;
    type: string;
    expirationDate: string;
    status: Status;
    remarks?: string | null;
    owner: string;
    inspectionDate?: string;
    image?: File;
  }
): Promise<Equipment> {
  const formData = new FormData();
  formData.append("brand", data.brand);
  formData.append("model", data.model);
  formData.append("type", data.type);
  formData.append("expirationDate", data.expirationDate);
  formData.append("status", data.status);
  if (data.remarks != null) formData.append("remarks", data.remarks);
  formData.append("owner", data.owner);
  if (data.inspectionDate) {
    formData.append("inspectionDate", data.inspectionDate);
  }
  if (data.image) {
    formData.append("image", data.image);
  }

  const res = await fetch(`${API_BASE}/${uid}`, {
    method: "PATCH",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to update equipment");
  }

  return (await res.json()) as Equipment;
}

export async function deleteEquipment(
  uid: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/${uid}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete equipment");
  }

  return (await res.json()) as { message: string };
}
