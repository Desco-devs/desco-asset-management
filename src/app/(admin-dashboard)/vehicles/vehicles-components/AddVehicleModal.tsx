"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Upload, X, Car } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";

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

interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  frontImgUrl?: string;
  backImgUrl?: string;
  side1ImgUrl?: string;
  side2ImgUrl?: string;
  originalReceiptUrl?: string;
  carRegistrationUrl?: string;
  pgpcInspectionImage?: string; // Added the new field
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

interface AddVehicleModalProps {
  onVehicleAdded: () => void;
  editVehicle?: Vehicle | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AddVehicleModal = ({
  onVehicleAdded,
  editVehicle = null,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddVehicleModalProps) => {
  const { user } = useAuth();

  const isAdmin = (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') ?? false;

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

  const isEditMode = editVehicle !== null;

  // Form state
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    type: "",
    plateNumber: "",
    inspectionDate: undefined as Date | undefined,
    before: 12,
    expiryDate: undefined as Date | undefined,
    status: "OPERATIONAL" as "OPERATIONAL" | "NON_OPERATIONAL",
    remarks: "",
    owner: "",
    locationId: "",
    clientId: "",
    projectId: "",
  });

  // Image files state - Updated to include PGPC inspection image
  const [imageFiles, setImageFiles] = useState({
    frontImg: null as File | null,
    backImg: null as File | null,
    side1Img: null as File | null,
    side2Img: null as File | null,
    originalReceipt: null as File | null,
    carRegistration: null as File | null,
    pgpcInspectionImg: null as File | null, // Added PGPC inspection image
  });

  // Image previews state - Updated to include PGPC inspection image
  const [imagePreviews, setImagePreviews] = useState({
    frontImg: null as string | null,
    backImg: null as string | null,
    side1Img: null as string | null,
    side2Img: null as string | null,
    originalReceipt: null as string | null,
    carRegistration: null as string | null,
    pgpcInspectionImg: null as string | null, // Added PGPC inspection image
  });

  // Keep existing image flags - Updated to include PGPC inspection image
  const [keepExistingImages, setKeepExistingImages] = useState({
    frontImg: true,
    backImg: true,
    side1Img: true,
    side2Img: true,
    originalReceipt: true,
    carRegistration: true,
    pgpcInspectionImg: true, // Added PGPC inspection image
  });

  // Populate form when editing
  useEffect(() => {
    if (editVehicle) {
      setFormData({
        brand: editVehicle.brand,
        model: editVehicle.model,
        type: editVehicle.type,
        plateNumber: editVehicle.plateNumber,
        inspectionDate: new Date(editVehicle.inspectionDate),
        before: editVehicle.before,
        expiryDate: new Date(editVehicle.expiryDate),
        status: editVehicle.status,
        remarks: editVehicle.remarks || "",
        owner: editVehicle.owner,
        locationId: editVehicle.project.client.location.uid,
        clientId: editVehicle.project.client.uid,
        projectId: editVehicle.project.uid,
      });

      // Set existing image previews - Updated to include PGPC inspection image
      setImagePreviews({
        frontImg: editVehicle.frontImgUrl || null,
        backImg: editVehicle.backImgUrl || null,
        side1Img: editVehicle.side1ImgUrl || null,
        side2Img: editVehicle.side2ImgUrl || null,
        originalReceipt: editVehicle.originalReceiptUrl || null,
        carRegistration: editVehicle.carRegistrationUrl || null,
        pgpcInspectionImg: editVehicle.pgpcInspectionImage || null, // Added PGPC inspection image
      });

      setKeepExistingImages({
        frontImg: !!editVehicle.frontImgUrl,
        backImg: !!editVehicle.backImgUrl,
        side1Img: !!editVehicle.side1ImgUrl,
        side2Img: !!editVehicle.side2ImgUrl,
        originalReceipt: !!editVehicle.originalReceiptUrl,
        carRegistration: !!editVehicle.carRegistrationUrl,
        pgpcInspectionImg: !!editVehicle.pgpcInspectionImage, // Added PGPC inspection image
      });
    }
  }, [editVehicle]);

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
          editVehicle?.project.client.location.uid !== formData.locationId)
      ) {
        setFormData((prev) => ({
          ...prev,
          clientId: isEditMode ? editVehicle?.project.client.uid || "" : "",
          projectId: isEditMode ? editVehicle?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredClients([]);
    }
  }, [formData.locationId, clients, isEditMode, editVehicle]);

  // Filter projects based on selected client
  useEffect(() => {
    if (formData.clientId && Array.isArray(projects)) {
      const projectsForClient = projects.filter(
        (project) => project.clientId === formData.clientId
      );
      setFilteredProjects(projectsForClient);

      if (
        !isEditMode ||
        (isEditMode && editVehicle?.project.client.uid !== formData.clientId)
      ) {
        setFormData((prev) => ({
          ...prev,
          projectId: isEditMode ? editVehicle?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredProjects([]);
    }
  }, [formData.clientId, projects, isEditMode, editVehicle]);

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

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: keyof typeof imageFiles
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFiles((prev) => ({
        ...prev,
        [imageType]: file,
      }));

      setKeepExistingImages((prev) => ({
        ...prev,
        [imageType]: false,
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => ({
          ...prev,
          [imageType]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (imageType: keyof typeof imageFiles) => {
    setImageFiles((prev) => ({
      ...prev,
      [imageType]: null,
    }));

    if (isEditMode) {
      // Reset to existing image if in edit mode
      const existingImageKey =
        imageType === "pgpcInspectionImg"
          ? "pgpcInspectionImage"
          : (`${imageType}Url` as keyof Vehicle);
      const existingImage = editVehicle?.[
        existingImageKey as keyof Vehicle
      ] as string;
      setImagePreviews((prev) => ({
        ...prev,
        [imageType]: existingImage || null,
      }));
      setKeepExistingImages((prev) => ({
        ...prev,
        [imageType]: !!existingImage,
      }));
    } else {
      setImagePreviews((prev) => ({
        ...prev,
        [imageType]: null,
      }));
    }
  };

  const removeExistingImage = (imageType: keyof typeof imageFiles) => {
    setImageFiles((prev) => ({
      ...prev,
      [imageType]: null,
    }));
    setImagePreviews((prev) => ({
      ...prev,
      [imageType]: null,
    }));
    setKeepExistingImages((prev) => ({
      ...prev,
      [imageType]: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitFormData = new FormData();

      // Add vehicle ID for edit mode
      if (isEditMode && editVehicle) {
        submitFormData.append("vehicleId", editVehicle.uid);
      }

      submitFormData.append("brand", formData.brand);
      submitFormData.append("model", formData.model);
      submitFormData.append("type", formData.type);
      submitFormData.append("plateNumber", formData.plateNumber);
      submitFormData.append(
        "inspectionDate",
        formData.inspectionDate!.toISOString()
      );
      submitFormData.append("before", formData.before.toString());
      submitFormData.append("expiryDate", formData.expiryDate!.toISOString());
      submitFormData.append("status", formData.status);
      submitFormData.append("owner", formData.owner);
      submitFormData.append("projectId", formData.projectId);

      if (formData.remarks) {
        submitFormData.append("remarks", formData.remarks);
      }

      // Append image files if they exist
      Object.entries(imageFiles).forEach(([key, file]) => {
        if (file) {
          submitFormData.append(key, file);
        }
      });

      // Add keep existing image flags for edit mode - Updated to include PGPC inspection image
      if (isEditMode) {
        submitFormData.append(
          "keepFrontImg",
          keepExistingImages.frontImg.toString()
        );
        submitFormData.append(
          "keepBackImg",
          keepExistingImages.backImg.toString()
        );
        submitFormData.append(
          "keepSide1Img",
          keepExistingImages.side1Img.toString()
        );
        submitFormData.append(
          "keepSide2Img",
          keepExistingImages.side2Img.toString()
        );
        submitFormData.append(
          "keepOriginalReceipt",
          keepExistingImages.originalReceipt.toString()
        );
        submitFormData.append(
          "keepCarRegistration",
          keepExistingImages.carRegistration.toString()
        );
        submitFormData.append(
          "keepPgpcInspectionImg",
          keepExistingImages.pgpcInspectionImg.toString()
        );
      }

      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("/api/vehicles", {
        method: method,
        body: submitFormData,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? "update" : "create"} vehicle`
        );
      }

      toast.success(`Vehicle ${isEditMode ? "updated" : "added"} successfully`);

      // Reset form - Updated to include PGPC inspection image
      setFormData({
        brand: "",
        model: "",
        type: "",
        plateNumber: "",
        inspectionDate: undefined,
        before: 12,
        expiryDate: undefined,
        status: "OPERATIONAL",
        remarks: "",
        owner: "",
        locationId: "",
        clientId: "",
        projectId: "",
      });

      setImageFiles({
        frontImg: null,
        backImg: null,
        side1Img: null,
        side2Img: null,
        originalReceipt: null,
        carRegistration: null,
        pgpcInspectionImg: null, // Added PGPC inspection image
      });

      setImagePreviews({
        frontImg: null,
        backImg: null,
        side1Img: null,
        side2Img: null,
        originalReceipt: null,
        carRegistration: null,
        pgpcInspectionImg: null, // Added PGPC inspection image
      });

      setKeepExistingImages({
        frontImg: true,
        backImg: true,
        side1Img: true,
        side2Img: true,
        originalReceipt: true,
        carRegistration: true,
        pgpcInspectionImg: true, // Added PGPC inspection image
      });

      setIsOpen(false);
      onVehicleAdded();
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} vehicle:`,
        error
      );
      toast.error(
        `Failed to ${isEditMode ? "update" : "add"} vehicle. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.brand &&
    formData.model &&
    formData.type &&
    formData.plateNumber &&
    formData.inspectionDate &&
    formData.expiryDate &&
    formData.owner &&
    formData.projectId;

  const ImageUploadSection = ({
    title,
    imageType,
    preview,
  }: {
    title: string;
    imageType: keyof typeof imageFiles;
    preview: string | null;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={imageType}>{title}</Label>
      <div className="space-y-2">
        <Input
          id={imageType}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageChange(e, imageType)}
          className="cursor-pointer"
        />

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt={`${title} preview`}
              className="w-full h-32 object-cover rounded-md border"
            />
            <div className="absolute top-1 right-1 flex gap-1">
              {isEditMode &&
                editVehicle?.[
                  imageType === "pgpcInspectionImg"
                    ? "pgpcInspectionImage"
                    : (`${imageType}Url` as keyof Vehicle)
                ] &&
                keepExistingImages[imageType] &&
                !imageFiles[imageType] && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeExistingImage(imageType)}
                    title="Remove existing image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              {imageFiles[imageType] && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(imageType)}
                  title="Remove new image"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {isEditMode &&
              editVehicle?.[
                imageType === "pgpcInspectionImg"
                  ? "pgpcInspectionImage"
                  : (`${imageType}Url` as keyof Vehicle)
              ] &&
              keepExistingImages[imageType] &&
              !imageFiles[imageType] && (
                <div className="absolute bottom-1 left-1">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Current
                  </span>
                </div>
              )}

            {imageFiles[imageType] && (
              <div className="absolute bottom-1 left-1">
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                  New
                </span>
              </div>
            )}
          </div>
        )}

        {!preview && (
          <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center text-gray-500">
            <Upload className="mx-auto h-6 w-6 mb-1" />
            <p className="text-xs">Upload {title}</p>
          </div>
        )}
      </div>
    </div>
  );

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
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4 dark:bg-primary"
        style={{
          maxWidth: "768px",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {isEditMode ? "Edit Vehicle" : "Add New Vehicle"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto scroll-none"
        >
          {/* Location, Client, Project Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
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

            {/* Vehicle Basic Info */}
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

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                placeholder="Enter vehicle type"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plate Number *</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    plateNumber: e.target.value,
                  }))
                }
                placeholder="Enter plate number"
                required
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "OPERATIONAL" | "NON_OPERATIONAL") =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-full">
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

            {/* Dates and Before (Months) */}
            <div className="space-y-2">
              <Label>PGPC Inspection Date *</Label>
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
                    {formData.inspectionDate ? (
                      format(formData.inspectionDate, "PPP")
                    ) : (
                      <span>Pick inspection date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.inspectionDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        inspectionDate: date,
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="before">Before (Months) *</Label>
              <Input
                id="before"
                type="number"
                min="1"
                max="60"
                value={formData.before}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    before: parseInt(e.target.value) || 12,
                  }))
                }
                placeholder="12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? (
                      format(formData.expiryDate, "PPP")
                    ) : (
                      <span>Pick expiry date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, expiryDate: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  remarks: e.target.value,
                }))
              }
              placeholder="Enter any additional remarks (optional)"
              rows={2}
            />
          </div>

          {/* Image Uploads - Updated to include PGPC Inspection Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vehicle Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploadSection
                title="Front Image"
                imageType="frontImg"
                preview={imagePreviews.frontImg}
              />
              <ImageUploadSection
                title="Back Image"
                imageType="backImg"
                preview={imagePreviews.backImg}
              />
              <ImageUploadSection
                title="Side 1 Image"
                imageType="side1Img"
                preview={imagePreviews.side1Img}
              />
              <ImageUploadSection
                title="INSURANCE"
                imageType="side2Img"
                preview={imagePreviews.side2Img}
              />
              <ImageUploadSection
                title="Original Receipt"
                imageType="originalReceipt"
                preview={imagePreviews.originalReceipt}
              />
              <ImageUploadSection
                title="Car Registration"
                imageType="carRegistration"
                preview={imagePreviews.carRegistration}
              />
              <ImageUploadSection
                title="PGPC Inspection Image"
                imageType="pgpcInspectionImg"
                preview={imagePreviews.pgpcInspectionImg}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="flex justify-end space-x-2 pt-4">
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
            type="button"
            variant="outline"
            disabled={!isFormValid || loading}
            className="bg-chart-3 hover:bg-chart-3/80 text-accent hover:text-accent dark:text-accent-foreground"
          >
            {loading
              ? isEditMode
                ? "Updating..."
                : "Adding..."
              : isEditMode
              ? "Update Vehicle"
              : "Add Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddVehicleModal;
