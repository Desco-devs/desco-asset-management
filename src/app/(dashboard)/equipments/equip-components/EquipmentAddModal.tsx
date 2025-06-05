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
import { CalendarIcon, Plus, Upload, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  expirationDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
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
    expirationDate: undefined as Date | undefined,
    status: "OPERATIONAL" as "OPERATIONAL" | "NON_OPERATIONAL",
    remarks: "",
    owner: "",
    inspectionDate: undefined as Date | undefined,
    locationId: "",
    clientId: "",
    projectId: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);

  // Populate form when editing
  useEffect(() => {
    if (editEquipment) {
      setFormData({
        brand: editEquipment.brand,
        model: editEquipment.model,
        type: editEquipment.type,
        expirationDate: new Date(editEquipment.expirationDate),
        status: editEquipment.status,
        remarks: editEquipment.remarks || "",
        owner: editEquipment.owner,
        inspectionDate: editEquipment.inspectionDate
          ? new Date(editEquipment.inspectionDate)
          : undefined,
        locationId: editEquipment.project.client.location.uid,
        clientId: editEquipment.project.client.uid,
        projectId: editEquipment.project.uid,
      });

      // Set existing image preview
      if (editEquipment.image_url) {
        setImagePreview(editEquipment.image_url);
        setKeepExistingImage(true);
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

      // Only reset client and project if not in edit mode or if location actually changed
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

      // Only reset project if not in edit mode or if client actually changed
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setKeepExistingImage(false);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitFormData = new FormData();

      // Add equipment ID for edit mode
      if (isEditMode && editEquipment) {
        submitFormData.append("equipmentId", editEquipment.uid);
      }

      submitFormData.append("brand", formData.brand);
      submitFormData.append("model", formData.model);
      submitFormData.append("type", formData.type);
      submitFormData.append(
        "expirationDate",
        formData.expirationDate!.toISOString()
      );
      submitFormData.append("status", formData.status);
      submitFormData.append("owner", formData.owner);
      submitFormData.append("projectId", formData.projectId);

      if (formData.remarks) {
        submitFormData.append("remarks", formData.remarks);
      }

      if (formData.inspectionDate) {
        submitFormData.append(
          "inspectionDate",
          formData.inspectionDate.toISOString()
        );
      }

      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      if (isEditMode) {
        submitFormData.append(
          "keepExistingImage",
          keepExistingImage.toString()
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
        expirationDate: undefined,
        status: "OPERATIONAL",
        remarks: "",
        owner: "",
        inspectionDate: undefined,
        locationId: "",
        clientId: "",
        projectId: "",
      });

      setImageFile(null);
      setImagePreview(null);
      setKeepExistingImage(true);

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
    formData.expirationDate &&
    formData.owner &&
    formData.projectId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="dark:text-accent-foreground dark:bg-chart-1 dark:hover:chart-1/80 bg-chart-3 hover:bg-chart-3/80">
            <Plus className="w-4 h-4 mr-2" /> Add New
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-4"
        style={{
          maxWidth: "768px", // equivalent to max-w-7xl (80rem = 1280px)
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

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label>Expiration Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expirationDate ? (
                      format(formData.expirationDate, "PPP")
                    ) : (
                      <span>Pick expiration date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expirationDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, expirationDate: date }))
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
                      setFormData((prev) => ({ ...prev, inspectionDate: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Image Upload */}
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
                  <img
                    src={imagePreview}
                    alt="Equipment preview"
                    className="w-full h-48 object-cover rounded-md border"
                  />
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

              {!imagePreview && (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center text-gray-500">
                  <Upload className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">Click above to upload an image</p>
                </div>
              )}
            </div>
          </div>

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
              type="submit"
              disabled={!isFormValid || loading}
              className="bg-chart-3 hover:bg-chart-3/80"
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
