"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle,
  FileText,
  Plus,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import EquipmentPartsManager from "./EquipmentPartsManager";

interface Location {
  uid: string;
  address: string;
}

interface Client {
  uid: string;
  name: string;
  locationId: string;
  location: {
    uid: string;
    address: string;
  };
}

interface Project {
  uid: string;
  name: string;
  clientId: string;
  client: {
    uid: string;
    name: string;
  };
}

interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate?: string;
  before?: number;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
  plateNumber?: string;
  originalReceiptUrl?: string;
  equipmentRegistrationUrl?: string;
  thirdpartyInspectionImage?: string;
  pgpcInspectionImage?: string;
  equipmentParts?: string[]; // Added equipment parts
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}

interface AddEquipmentModalProps {
  onEquipmentAdded: () => void;
  editEquipment?: Equipment | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AddEquipmentModal = ({
  onEquipmentAdded,
  editEquipment = null,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddEquipmentModalProps) => {
  const { user } = useAuth();

  const isAdmin =
    user?.permissions.some((p) => ["CREATE", "UPDATE", "DELETE"].includes(p)) ??
    false;

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  // Use controlled or internal state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  const isEditMode = editEquipment !== null;

  // Form state
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    type: "",
    insuranceExpirationDate: undefined as Date | undefined,
    before: "" as string,
    status: "OPERATIONAL" as "OPERATIONAL" | "NON_OPERATIONAL",
    remarks: "",
    owner: "",
    plateNumber: "",
    inspectionDate: undefined as Date | undefined,
    locationId: "",
    clientId: "",
    projectId: "",
  });

  // File states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);

  const [originalReceiptFile, setOriginalReceiptFile] = useState<File | null>(
    null
  );
  const [originalReceiptPreview, setOriginalReceiptPreview] = useState<
    string | null
  >(null);
  const [keepExistingReceipt, setKeepExistingReceipt] = useState(true);

  const [equipmentRegistrationFile, setEquipmentRegistrationFile] =
    useState<File | null>(null);
  const [equipmentRegistrationPreview, setEquipmentRegistrationPreview] =
    useState<string | null>(null);
  const [keepExistingRegistration, setKeepExistingRegistration] =
    useState(true);

  const [thirdpartyInspectionFile, setThirdpartyInspectionFile] =
    useState<File | null>(null);
  const [thirdpartyInspectionPreview, setThirdpartyInspectionPreview] =
    useState<string | null>(null);
  const [
    keepExistingThirdpartyInspection,
    setKeepExistingThirdpartyInspection,
  ] = useState(true);

  const [pgpcInspectionFile, setPgpcInspectionFile] = useState<File | null>(
    null
  );
  const [pgpcInspectionPreview, setPgpcInspectionPreview] = useState<
    string | null
  >(null);
  const [keepExistingPgpcInspection, setKeepExistingPgpcInspection] =
    useState(true);

  // Equipment parts state
  const [equipmentParts, setEquipmentParts] = useState<EquipmentPart[]>([]);
  const [equipmentFolders, setEquipmentFolders] = useState<EquipmentFolder[]>(
    []
  );

  // Populate form when editing
  useEffect(() => {
    if (editEquipment) {
      // Helper function to safely parse dates
      const safeParseDate = (dateString: string) => {
        if (!dateString) return undefined;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? undefined : date;
      };

      setFormData({
        brand: editEquipment.brand,
        model: editEquipment.model,
        type: editEquipment.type,
        insuranceExpirationDate: safeParseDate(
          editEquipment.insuranceExpirationDate || ""
        ),
        before: editEquipment.before?.toString() || "",
        status: editEquipment.status,
        remarks: editEquipment.remarks || "",
        owner: editEquipment.owner,
        plateNumber: editEquipment.plateNumber || "",
        inspectionDate: safeParseDate(editEquipment.inspectionDate || ""),
        locationId: editEquipment.project.client.location.uid,
        clientId: editEquipment.project.client.uid,
        projectId: editEquipment.project.uid,
      });

      // Set existing file previews
      if (editEquipment.image_url) {
        setImagePreview(editEquipment.image_url);
        setKeepExistingImage(true);
      }

      if (editEquipment.originalReceiptUrl) {
        setOriginalReceiptPreview(editEquipment.originalReceiptUrl);
        setKeepExistingReceipt(true);
      }

      if (editEquipment.equipmentRegistrationUrl) {
        setEquipmentRegistrationPreview(editEquipment.equipmentRegistrationUrl);
        setKeepExistingRegistration(true);
      }

      if (editEquipment.thirdpartyInspectionImage) {
        setThirdpartyInspectionPreview(editEquipment.thirdpartyInspectionImage);
        setKeepExistingThirdpartyInspection(true);
      }

      if (editEquipment.pgpcInspectionImage) {
        setPgpcInspectionPreview(editEquipment.pgpcInspectionImage);
        setKeepExistingPgpcInspection(true);
      }

      // Set existing equipment parts
      if (
        editEquipment.equipmentParts &&
        editEquipment.equipmentParts.length > 0
      ) {
        const existingParts: EquipmentPart[] = editEquipment.equipmentParts.map(
          (url) => ({
            file: null,
            preview: url,
            isExisting: true,
            existingUrl: url,
          })
        );
        setEquipmentParts(existingParts);
      }
    }
  }, [editEquipment]);

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchClients();
      fetchProjects();
    }
  }, [isOpen]);

  // Filter clients based on selected location
  useEffect(() => {
    if (formData.locationId && Array.isArray(clients)) {
      const clientsInLocation = clients.filter(
        (client) => client.locationId === formData.locationId
      );
      setFilteredClients(clientsInLocation);

      if (
        !isEditMode ||
        (isEditMode &&
          editEquipment?.project.client.location.uid !== formData.locationId)
      ) {
        setFormData((prev) => ({
          ...prev,
          clientId: isEditMode ? editEquipment?.project.client.uid || "" : "",
          projectId: isEditMode ? editEquipment?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredClients([]);
    }
  }, [formData.locationId, clients, isEditMode, editEquipment]);

  // Filter projects based on selected client
  useEffect(() => {
    if (formData.clientId && Array.isArray(projects)) {
      const projectsForClient = projects.filter(
        (project) => project.clientId === formData.clientId
      );
      setFilteredProjects(projectsForClient);

      if (
        !isEditMode ||
        (isEditMode && editEquipment?.project.client.uid !== formData.clientId)
      ) {
        setFormData((prev) => ({
          ...prev,
          projectId: isEditMode ? editEquipment?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredProjects([]);
    }
  }, [formData.clientId, projects, isEditMode, editEquipment]);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    }
  };

  const fetchProjects = async () => {
    try {
      let response = await fetch("/api/projects/getall");

      if (!response.ok) {
        response = await fetch("/api/projects");
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch projects: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
      toast.error("Failed to load projects. Please try again.");
    }
  };

  // Helper function to find folder by path
  const findFolderByPath = (
    folders: EquipmentFolder[],
    path: string[]
  ): EquipmentFolder | null => {
    if (path.length === 0) return null;

    let currentFolders = folders;
    let currentFolder = null;

    for (const folderId of path) {
      currentFolder = currentFolders.find((f) => f.id === folderId);
      if (!currentFolder) return null;
      currentFolders = currentFolder.subfolders;
    }

    return currentFolder;
  };

  // Helper function to update folders recursively
  const updateFoldersRecursively = (
    folders: EquipmentFolder[],
    targetId: string,
    updateFn: (folder: EquipmentFolder) => EquipmentFolder
  ): EquipmentFolder[] => {
    return folders.map((folder) => {
      if (folder.id === targetId) {
        return updateFn(folder);
      }
      return {
        ...folder,
        subfolders: updateFoldersRecursively(
          folder.subfolders,
          targetId,
          updateFn
        ),
      };
    });
  };

  // Helper function to delete folder recursively
  const deleteFolderRecursively = (
    folders: EquipmentFolder[],
    targetId: string
  ): EquipmentFolder[] => {
    return folders
      .filter((folder) => folder.id !== targetId)
      .map((folder) => ({
        ...folder,
        subfolders: deleteFolderRecursively(folder.subfolders, targetId),
      }));
  };

  // Folder Management Functions
  const createFolder = () => {
    const folderId = `folder_${Date.now()}`;
    const newFolder: EquipmentFolder = {
      id: folderId,
      name: "New Folder",
      parts: [],
      subfolders: [],
      parentId: selectedFolderId || undefined,
    };

    if (selectedFolderId) {
      // Add to current folder
      setEquipmentFolders((prev) =>
        updateFoldersRecursively(prev, selectedFolderId, (folder) => ({
          ...folder,
          subfolders: [...folder.subfolders, newFolder],
        }))
      );
    } else {
      // Add to root
      setEquipmentFolders((prev) => [...prev, newFolder]);
    }

    setEditingFolderId(folderId);
    setNewFolderName("New Folder");
  };

  const renameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;

    setEquipmentFolders((prev) =>
      updateFoldersRecursively(prev, folderId, (folder) => ({
        ...folder,
        name: newName.trim(),
      }))
    );

    setEditingFolderId(null);
    setNewFolderName("");
  };

  const deleteFolder = (folderId: string) => {
    // Find and collect all parts from deleted folder and its subfolders
    const collectPartsFromFolder = (
      folder: EquipmentFolder
    ): EquipmentPart[] => {
      let allParts = [...folder.parts];
      folder.subfolders.forEach((subfolder) => {
        allParts = [...allParts, ...collectPartsFromFolder(subfolder)];
      });
      return allParts;
    };

    const findAndCollectParts = (
      folders: EquipmentFolder[]
    ): EquipmentPart[] => {
      for (const folder of folders) {
        if (folder.id === folderId) {
          return collectPartsFromFolder(folder);
        }
        const found = findAndCollectParts(folder.subfolders);
        if (found.length > 0) return found;
      }
      return [];
    };

    const partsToMove = findAndCollectParts(equipmentFolders);

    // Move all parts back to main parts list
    setEquipmentParts((prev) => [
      ...prev,
      ...partsToMove.map((part) => ({ ...part, folderId: undefined })),
    ]);

    // Delete the folder
    setEquipmentFolders((prev) => deleteFolderRecursively(prev, folderId));

    // If we're currently in the deleted folder, go back to parent or root
    if (selectedFolderId === folderId) {
      if (folderPath.length > 1) {
        const newPath = folderPath.slice(0, -1);
        setFolderPath(newPath);
        setSelectedFolderId(newPath[newPath.length - 1]);
      } else {
        setFolderPath([]);
        setSelectedFolderId(null);
      }
    }
  };

  const navigateToFolder = (folderId: string) => {
    const newPath = [...folderPath, folderId];
    setFolderPath(newPath);
    setSelectedFolderId(folderId);
  };

  const navigateBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setSelectedFolderId(newPath[newPath.length - 1]);
    } else {
      setFolderPath([]);
      setSelectedFolderId(null);
    }
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setSelectedFolderId(null);
  };

  const movePartToFolder = (partIndex: number, folderId: string | null) => {
    const getCurrentParts = () => {
      if (selectedFolderId) {
        const currentFolder = findFolderByPath(equipmentFolders, folderPath);
        return currentFolder?.parts || [];
      }
      return equipmentParts;
    };

    const currentParts = getCurrentParts();
    const part = currentParts[partIndex];
    if (!part) return;

    if (folderId) {
      // Move part to target folder
      setEquipmentFolders((prev) =>
        updateFoldersRecursively(prev, folderId, (folder) => ({
          ...folder,
          parts: [...folder.parts, { ...part, folderId }],
        }))
      );
    } else {
      // Move part to main list
      setEquipmentParts((prev) => [...prev, { ...part, folderId: undefined }]);
    }

    // Remove from current location
    if (selectedFolderId) {
      setEquipmentFolders((prev) =>
        updateFoldersRecursively(prev, selectedFolderId, (folder) => ({
          ...folder,
          parts: folder.parts.filter((_, index) => index !== partIndex),
        }))
      );
    } else {
      setEquipmentParts((prev) =>
        prev.filter((_, index) => index !== partIndex)
      );
    }
  };

  const movePartFromFolder = (folderId: string, partIndex: number) => {
    setEquipmentFolders((prev) =>
      updateFoldersRecursively(prev, folderId, (folder) => ({
        ...folder,
        parts: folder.parts.filter((_, index) => index !== partIndex),
      }))
    );
  };

  // Equipment Parts Functions
  const handleEquipmentPartsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const newParts: EquipmentPart[] = files.map((file) => {
      const reader = new FileReader();
      const preview = URL.createObjectURL(file);

      return {
        file,
        preview,
        isExisting: false,
      };
    });

    setEquipmentParts((prev) => [...prev, ...newParts]);
  };

  const addEquipmentPart = () => {
    const newPart: EquipmentPart = {
      file: null,
      preview: null,
      isExisting: false,
      folderId: selectedFolderId || undefined,
    };

    if (selectedFolderId) {
      // Add to current folder
      setEquipmentFolders((prev) =>
        updateFoldersRecursively(prev, selectedFolderId, (folder) => ({
          ...folder,
          parts: [...folder.parts, newPart],
        }))
      );
    } else {
      // Add to main parts list
      setEquipmentParts((prev) => [...prev, newPart]);
    }
  };

  const removeEquipmentPart = (index: number, folderId?: string) => {
    if (folderId) {
      // Remove from folder
      setEquipmentFolders((prev) =>
        prev.map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                parts: folder.parts.filter((part, i) => {
                  if (i === index) {
                    // Clean up object URL if it exists
                    if (part.preview && !part.isExisting) {
                      URL.revokeObjectURL(part.preview);
                    }
                    return false;
                  }
                  return true;
                }),
              }
            : folder
        )
      );
    } else {
      // Remove from main parts list
      setEquipmentParts((prev) => {
        const newParts = [...prev];
        // Clean up object URL if it exists
        if (newParts[index].preview && !newParts[index].isExisting) {
          URL.revokeObjectURL(newParts[index].preview!);
        }
        newParts.splice(index, 1);
        return newParts;
      });
    }
  };

  const updateEquipmentPart = (
    index: number,
    file: File,
    folderId?: string
  ) => {
    if (folderId) {
      // Update part in folder
      setEquipmentFolders((prev) =>
        prev.map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                parts: folder.parts.map((part, i) => {
                  if (i === index) {
                    // Clean up old object URL if it exists
                    if (part.preview && !part.isExisting) {
                      URL.revokeObjectURL(part.preview);
                    }
                    return {
                      file,
                      preview: URL.createObjectURL(file),
                      isExisting: false,
                      folderId,
                    };
                  }
                  return part;
                }),
              }
            : folder
        )
      );
    } else {
      // Update part in main list
      setEquipmentParts((prev) => {
        const newParts = [...prev];
        // Clean up old object URL if it exists
        if (newParts[index].preview && !newParts[index].isExisting) {
          URL.revokeObjectURL(newParts[index].preview!);
        }
        newParts[index] = {
          file,
          preview: URL.createObjectURL(file),
          isExisting: false,
        };
        return newParts;
      });
    }
  };

  // Regular file handling functions
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setKeepExistingImage(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOriginalReceiptChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalReceiptFile(file);
      setKeepExistingReceipt(false);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setOriginalReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setOriginalReceiptPreview(file.name);
      }
    }
  };

  const handleEquipmentRegistrationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setEquipmentRegistrationFile(file);
      setKeepExistingRegistration(false);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEquipmentRegistrationPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setEquipmentRegistrationPreview(file.name);
      }
    }
  };

  const handleThirdpartyInspectionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setThirdpartyInspectionFile(file);
      setKeepExistingThirdpartyInspection(false);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setThirdpartyInspectionPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setThirdpartyInspectionPreview(file.name);
      }
    }
  };

  const handlePgpcInspectionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setPgpcInspectionFile(file);
      setKeepExistingPgpcInspection(false);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPgpcInspectionPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPgpcInspectionPreview(file.name);
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(
      isEditMode && editEquipment?.image_url ? editEquipment.image_url : null
    );
    setKeepExistingImage(isEditMode && editEquipment?.image_url ? true : false);
  };

  const removeExistingImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setKeepExistingImage(false);
  };

  const removeOriginalReceipt = () => {
    setOriginalReceiptFile(null);
    setOriginalReceiptPreview(
      isEditMode && editEquipment?.originalReceiptUrl
        ? editEquipment.originalReceiptUrl
        : null
    );
    setKeepExistingReceipt(
      isEditMode && editEquipment?.originalReceiptUrl ? true : false
    );
  };

  const removeExistingOriginalReceipt = () => {
    setOriginalReceiptFile(null);
    setOriginalReceiptPreview(null);
    setKeepExistingReceipt(false);
  };

  const removeEquipmentRegistration = () => {
    setEquipmentRegistrationFile(null);
    setEquipmentRegistrationPreview(
      isEditMode && editEquipment?.equipmentRegistrationUrl
        ? editEquipment.equipmentRegistrationUrl
        : null
    );
    setKeepExistingRegistration(
      isEditMode && editEquipment?.equipmentRegistrationUrl ? true : false
    );
  };

  const removeExistingEquipmentRegistration = () => {
    setEquipmentRegistrationFile(null);
    setEquipmentRegistrationPreview(null);
    setKeepExistingRegistration(false);
  };

  const removeThirdpartyInspection = () => {
    setThirdpartyInspectionFile(null);
    setThirdpartyInspectionPreview(
      isEditMode && editEquipment?.thirdpartyInspectionImage
        ? editEquipment.thirdpartyInspectionImage
        : null
    );
    setKeepExistingThirdpartyInspection(
      isEditMode && editEquipment?.thirdpartyInspectionImage ? true : false
    );
  };

  const removeExistingThirdpartyInspection = () => {
    setThirdpartyInspectionFile(null);
    setThirdpartyInspectionPreview(null);
    setKeepExistingThirdpartyInspection(false);
  };

  const removePgpcInspection = () => {
    setPgpcInspectionFile(null);
    setPgpcInspectionPreview(
      isEditMode && editEquipment?.pgpcInspectionImage
        ? editEquipment.pgpcInspectionImage
        : null
    );
    setKeepExistingPgpcInspection(
      isEditMode && editEquipment?.pgpcInspectionImage ? true : false
    );
  };

  const removeExistingPgpcInspection = () => {
    setPgpcInspectionFile(null);
    setPgpcInspectionPreview(null);
    setKeepExistingPgpcInspection(false);
  };

  const renderFilePreview = (
    preview: string | null,
    isImage: boolean,
    placeholder: string
  ) => {
    if (!preview) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center text-gray-500">
          <Upload className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">{placeholder}</p>
        </div>
      );
    }

    if (
      isImage &&
      (preview.startsWith("data:") || preview.startsWith("http"))
    ) {
      return (
        <img
          src={preview}
          alt="File preview"
          className="w-full h-32 object-cover rounded-md border"
        />
      );
    }

    return (
      <div className="border rounded-md p-4 text-center">
        <FileText className="mx-auto h-8 w-8 mb-2 text-blue-500" />
        <p className="text-sm text-gray-600 truncate">
          {preview.includes("/") ? preview.split("/").pop() : preview}
        </p>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitFormData = new FormData();

      // Add equipment ID for edit mode
      if (isEditMode && editEquipment) {
        submitFormData.append("equipmentId", editEquipment.uid);
      }
      if (formData.insuranceExpirationDate) {
        submitFormData.append(
          "insuranceExpirationDate",
          formData.insuranceExpirationDate.toISOString()
        );
      }

      submitFormData.append("brand", formData.brand);
      submitFormData.append("model", formData.model);
      submitFormData.append("type", formData.type);

      if (formData.before) {
        submitFormData.append("before", formData.before);
      }
      submitFormData.append("status", formData.status);
      submitFormData.append("owner", formData.owner);
      submitFormData.append("projectId", formData.projectId);

      if (formData.remarks) {
        submitFormData.append("remarks", formData.remarks);
      }

      if (formData.plateNumber) {
        submitFormData.append("plateNumber", formData.plateNumber);
      }

      if (formData.inspectionDate) {
        submitFormData.append(
          "inspectionDate",
          formData.inspectionDate.toISOString()
        );
      }

      // Add regular file uploads
      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      if (originalReceiptFile) {
        submitFormData.append("originalReceipt", originalReceiptFile);
      }

      if (equipmentRegistrationFile) {
        submitFormData.append(
          "equipmentRegistration",
          equipmentRegistrationFile
        );
      }

      if (thirdpartyInspectionFile) {
        submitFormData.append("thirdpartyInspection", thirdpartyInspectionFile);
      }

      if (pgpcInspectionFile) {
        submitFormData.append("pgpcInspection", pgpcInspectionFile);
      }

      // Add equipment parts from main list
      let partIndex = 0;
      equipmentParts.forEach((part) => {
        if (part.file) {
          submitFormData.append(`equipmentPart_${partIndex}`, part.file);
          submitFormData.append(`equipmentPartFolder_${partIndex}`, "main");
        } else if (part.isExisting && part.existingUrl) {
          // For existing parts, send a flag to keep them
          submitFormData.append(`keepExistingPart_${partIndex}`, "true");
          submitFormData.append(`equipmentPartFolder_${partIndex}`, "main");
        }
        partIndex++;
      });

      // Add equipment parts from folders
      equipmentFolders.forEach((folder) => {
        folder.parts.forEach((part) => {
          if (part.file) {
            submitFormData.append(`equipmentPart_${partIndex}`, part.file);
            submitFormData.append(
              `equipmentPartFolder_${partIndex}`,
              folder.name
            );
          } else if (part.isExisting && part.existingUrl) {
            submitFormData.append(`keepExistingPart_${partIndex}`, "true");
            submitFormData.append(
              `equipmentPartFolder_${partIndex}`,
              folder.name
            );
          }
          partIndex++;
        });
      });

      // Add keep existing file flags for edit mode
      if (isEditMode) {
        submitFormData.append(
          "keepExistingImage",
          keepExistingImage.toString()
        );
        submitFormData.append(
          "keepExistingReceipt",
          keepExistingReceipt.toString()
        );
        submitFormData.append(
          "keepExistingRegistration",
          keepExistingRegistration.toString()
        );
        submitFormData.append(
          "keepExistingThirdpartyInspection",
          keepExistingThirdpartyInspection.toString()
        );
        submitFormData.append(
          "keepExistingPgpcInspection",
          keepExistingPgpcInspection.toString()
        );
      }

      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("/api/equipments", {
        method: method,
        body: submitFormData,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? "update" : "create"} equipment`
        );
      }

      toast.success(
        `Equipment ${isEditMode ? "updated" : "added"} successfully`
      );

      // Reset form
      setFormData({
        brand: "",
        model: "",
        type: "",
        insuranceExpirationDate: undefined,
        before: "",
        status: "OPERATIONAL",
        remarks: "",
        owner: "",
        plateNumber: "",
        inspectionDate: undefined,
        locationId: "",
        clientId: "",
        projectId: "",
      });

      // Reset file states
      setImageFile(null);
      setImagePreview(null);
      setKeepExistingImage(true);
      setOriginalReceiptFile(null);
      setOriginalReceiptPreview(null);
      setKeepExistingReceipt(true);
      setEquipmentRegistrationFile(null);
      setEquipmentRegistrationPreview(null);
      setKeepExistingRegistration(true);
      setThirdpartyInspectionFile(null);
      setThirdpartyInspectionPreview(null);
      setKeepExistingThirdpartyInspection(true);
      setPgpcInspectionFile(null);
      setPgpcInspectionPreview(null);
      setKeepExistingPgpcInspection(true);

      // Reset equipment parts
      equipmentParts.forEach((part) => {
        if (part.preview && !part.isExisting) {
          URL.revokeObjectURL(part.preview);
        }
      });
      setEquipmentParts([]);

      // Reset equipment folders recursively
      const cleanupFolder = (folder: EquipmentFolder) => {
        folder.parts.forEach((part) => {
          if (part.preview && !part.isExisting) {
            URL.revokeObjectURL(part.preview);
          }
        });
        folder.subfolders.forEach(cleanupFolder);
      };

      equipmentFolders.forEach(cleanupFolder);
      setEquipmentFolders([]);
      setSelectedFolderId(null);
      setEditingFolderId(null);
      setNewFolderName("");
      setFolderPath([]);

      setIsOpen(false);
      onEquipmentAdded();
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} equipment:`,
        error
      );
      toast.error(
        `Failed to ${
          isEditMode ? "update" : "add"
        } equipment. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.brand &&
    formData.model &&
    formData.type &&
    formData.owner &&
    formData.projectId;

  // Function to trigger form submission from button click
  const triggerSubmit = () => {
    const form = document.querySelector("form") as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEditMode && isAdmin && (
        <DialogTrigger asChild>
          <Button className="dark:text-accent-foreground dark:bg-chart-1 dark:hover:chart-1/80 bg-chart-3 hover:bg-chart-3/80">
            <Plus className="w-4 h-4 mr-2" /> Add New
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4"
        style={{
          maxWidth: "1024px",
        }}
      >
        <DialogHeader className="">
          <DialogTitle className="text-base font-bold">
            {isEditMode ? "Edit Equipment" : "Add New Equipment"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto scroll-none p-2"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Location Selection */}
            <div className="space-y-2 w-full">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.locationId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, locationId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.uid} value={location.uid}>
                      {location.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, clientId: value }))
                }
                disabled={!formData.locationId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.uid} value={client.uid}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, projectId: value }))
                }
                disabled={!formData.clientId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.uid} value={project.uid}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, brand: e.target.value }))
                }
                placeholder="Enter brand"
                required
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="Enter model"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                placeholder="Enter equipment type"
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "OPERATIONAL" | "NON_OPERATIONAL") =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                  <SelectItem value="NON_OPERATIONAL">
                    NON_OPERATIONAL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <Label htmlFor="owner">Owner *</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, owner: e.target.value }))
                }
                placeholder="Enter owner name"
                required
              />
            </div>

            {/* Plate Number */}
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plate Number</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    plateNumber: e.target.value,
                  }))
                }
                placeholder="Enter plate number (optional)"
              />
            </div>

            {/* Before (Months) */}
            <div className="space-y-2">
              <Label htmlFor="before">Before (Months)</Label>
              <Input
                id="before"
                type="number"
                min="0"
                value={formData.before}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    before: e.target.value,
                  }))
                }
                placeholder="Enter months before expiration (optional)"
              />
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label>PGPC Inspection (1 month) </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.insuranceExpirationDate &&
                        "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.insuranceExpirationDate &&
                    !isNaN(formData.insuranceExpirationDate.getTime()) ? (
                      format(formData.insuranceExpirationDate, "PPP")
                    ) : (
                      <span>Pick expiration date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.insuranceExpirationDate &&
                      !isNaN(formData.insuranceExpirationDate.getTime())
                        ? formData.insuranceExpirationDate
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        insuranceExpirationDate: date,
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Inspection Date */}
            <div className="space-y-2">
              <Label>Inspection Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.inspectionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.inspectionDate &&
                    !isNaN(formData.inspectionDate.getTime()) ? (
                      format(formData.inspectionDate, "PPP")
                    ) : (
                      <span>Pick inspection date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.inspectionDate &&
                      !isNaN(formData.inspectionDate.getTime())
                        ? formData.inspectionDate
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, inspectionDate: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* File Upload Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {/* Equipment Image */}
            <div className="space-y-2">
              <Label htmlFor="image">Equipment Image</Label>
              <div className="space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />

                {imagePreview && (
                  <div className="relative">
                    {renderFilePreview(imagePreview, true, "")}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isEditMode &&
                        editEquipment?.image_url &&
                        keepExistingImage &&
                        !imageFile && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeExistingImage}
                            title="Remove existing image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {imageFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeImage}
                          title="Remove new image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode &&
                      editEquipment?.image_url &&
                      keepExistingImage &&
                      !imageFile && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Current Image
                          </span>
                        </div>
                      )}

                    {imageFile && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          New Image
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!imagePreview &&
                  renderFilePreview(
                    null,
                    true,
                    "Click above to upload an image"
                  )}
              </div>
            </div>

            {/* Original Receipt */}
            <div className="space-y-2">
              <Label htmlFor="originalReceipt">Original Receipt</Label>
              <div className="space-y-2">
                <Input
                  id="originalReceipt"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleOriginalReceiptChange}
                  className="cursor-pointer"
                />

                {originalReceiptPreview && (
                  <div className="relative">
                    {renderFilePreview(
                      originalReceiptPreview,
                      originalReceiptFile?.type?.startsWith("image/") ||
                        originalReceiptPreview.includes("data:image") ||
                        originalReceiptPreview.match(
                          /\.(jpg|jpeg|png|gif|webp)$/i
                        ) !== null,
                      ""
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isEditMode &&
                        editEquipment?.originalReceiptUrl &&
                        keepExistingReceipt &&
                        !originalReceiptFile && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeExistingOriginalReceipt}
                            title="Remove existing receipt"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {originalReceiptFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeOriginalReceipt}
                          title="Remove new receipt"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode &&
                      editEquipment?.originalReceiptUrl &&
                      keepExistingReceipt &&
                      !originalReceiptFile && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Current Receipt
                          </span>
                        </div>
                      )}

                    {originalReceiptFile && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          New Receipt
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!originalReceiptPreview &&
                  renderFilePreview(
                    null,
                    false,
                    "Click above to upload receipt"
                  )}
              </div>
            </div>

            {/* Equipment Registration */}
            <div className="space-y-2">
              <Label htmlFor="equipmentRegistration">
                Equipment Registration
              </Label>
              <div className="space-y-2">
                <Input
                  id="equipmentRegistration"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleEquipmentRegistrationChange}
                  className="cursor-pointer"
                />

                {equipmentRegistrationPreview && (
                  <div className="relative">
                    {renderFilePreview(
                      equipmentRegistrationPreview,
                      equipmentRegistrationFile?.type?.startsWith("image/") ||
                        equipmentRegistrationPreview.includes("data:image") ||
                        equipmentRegistrationPreview.match(
                          /\.(jpg|jpeg|png|gif|webp)$/i
                        ) !== null,
                      ""
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isEditMode &&
                        editEquipment?.equipmentRegistrationUrl &&
                        keepExistingRegistration &&
                        !equipmentRegistrationFile && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeExistingEquipmentRegistration}
                            title="Remove existing registration"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {equipmentRegistrationFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeEquipmentRegistration}
                          title="Remove new registration"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode &&
                      editEquipment?.equipmentRegistrationUrl &&
                      keepExistingRegistration &&
                      !equipmentRegistrationFile && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Current Registration
                          </span>
                        </div>
                      )}

                    {equipmentRegistrationFile && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          New Registration
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!equipmentRegistrationPreview &&
                  renderFilePreview(
                    null,
                    false,
                    "Click above to upload registration"
                  )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-4">
            {/* Third-Party Inspection Image */}
            <div className="space-y-2">
              <Label htmlFor="thirdpartyInspection">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-orange-500" />
                  Third-Party Inspection
                </div>
              </Label>
              <div className="space-y-2">
                <Input
                  id="thirdpartyInspection"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleThirdpartyInspectionChange}
                  className="cursor-pointer"
                />

                {thirdpartyInspectionPreview && (
                  <div className="relative">
                    {renderFilePreview(
                      thirdpartyInspectionPreview,
                      thirdpartyInspectionFile?.type?.startsWith("image/") ||
                        thirdpartyInspectionPreview.includes("data:image") ||
                        thirdpartyInspectionPreview.match(
                          /\.(jpg|jpeg|png|gif|webp)$/i
                        ) !== null,
                      ""
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isEditMode &&
                        editEquipment?.thirdpartyInspectionImage &&
                        keepExistingThirdpartyInspection &&
                        !thirdpartyInspectionFile && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeExistingThirdpartyInspection}
                            title="Remove existing third-party inspection"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {thirdpartyInspectionFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeThirdpartyInspection}
                          title="Remove new third-party inspection"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode &&
                      editEquipment?.thirdpartyInspectionImage &&
                      keepExistingThirdpartyInspection &&
                      !thirdpartyInspectionFile && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Current Inspection
                          </span>
                        </div>
                      )}

                    {thirdpartyInspectionFile && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          New Inspection
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!thirdpartyInspectionPreview &&
                  renderFilePreview(
                    null,
                    false,
                    "Click above to upload third-party inspection"
                  )}
              </div>
            </div>

            {/* PGPC Inspection Image */}
            <div className="space-y-2">
              <Label htmlFor="pgpcInspection">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-teal-500" />
                  PGPC Inspection
                </div>
              </Label>
              <div className="space-y-2">
                <Input
                  id="pgpcInspection"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handlePgpcInspectionChange}
                  className="cursor-pointer"
                />

                {pgpcInspectionPreview && (
                  <div className="relative">
                    {renderFilePreview(
                      pgpcInspectionPreview,
                      pgpcInspectionFile?.type?.startsWith("image/") ||
                        pgpcInspectionPreview.includes("data:image") ||
                        pgpcInspectionPreview.match(
                          /\.(jpg|jpeg|png|gif|webp)$/i
                        ) !== null,
                      ""
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isEditMode &&
                        editEquipment?.pgpcInspectionImage &&
                        keepExistingPgpcInspection &&
                        !pgpcInspectionFile && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeExistingPgpcInspection}
                            title="Remove existing PGPC inspection"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {pgpcInspectionFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removePgpcInspection}
                          title="Remove new PGPC inspection"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode &&
                      editEquipment?.pgpcInspectionImage &&
                      keepExistingPgpcInspection &&
                      !pgpcInspectionFile && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Current PGPC
                          </span>
                        </div>
                      )}

                    {pgpcInspectionFile && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          New PGPC
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!pgpcInspectionPreview &&
                  renderFilePreview(
                    null,
                    false,
                    "Click above to upload PGPC inspection"
                  )}
              </div>
            </div>
          </div>

          {/* Equipment Parts Section */}
          <EquipmentPartsManager
            equipmentParts={equipmentParts}
            setEquipmentParts={setEquipmentParts}
            equipmentFolders={equipmentFolders}
            setEquipmentFolders={setEquipmentFolders}
          />

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder="Enter any additional remarks (optional)"
              rows={3}
            />
          </div>
        </form>
        <DialogFooter className="p-0">
          {/* Submit Button */}
          <div className="flex justify-end space-x-2 py-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={triggerSubmit}
              type="submit"
              disabled={!isFormValid || loading}
              className="bg-chart-3 hover:bg-chart-3/80 dark:text-accent-foreground"
            >
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Adding..."
                : isEditMode
                ? "Update Equipment"
                : "Add Equipment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEquipmentModal;
