"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createVehicleAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Camera, FileText, Upload } from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? "Creating Vehicle..." : "Create Vehicle"}
    </button>
  );
}

interface CreateVehicleFormProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  isMobile?: boolean;
}

export default function CreateVehicleForm({ projects, onSuccess, onCancel, isMobile = false }: CreateVehicleFormProps) {
  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'documents'>('details');
  
  // File state for images and documents
  const [files, setFiles] = useState({
    frontImg: null as File | null,
    backImg: null as File | null,
    side1Img: null as File | null,
    side2Img: null as File | null,
    originalReceipt: null as File | null,
    carRegistration: null as File | null,
    pgpcInspection: null as File | null,
  });
  
  // File change handlers
  const handleFileChange = (fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  const handleAction = async (formData: FormData) => {
    try {
      // Add all the files to formData
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });
      
      const result = await createVehicleAction(formData);
      
      // Show success message
      if (result.filesUploaded > 0) {
        alert(`✅ Vehicle created successfully with ${result.filesUploaded} files uploaded!`);
      } else {
        alert("✅ Vehicle created successfully!");
      }
      
      // Form will reset automatically after successful submission
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert("❌ Error: " + (error instanceof Error ? error.message : "Failed to create vehicle"));
    }
  };

  // Tab content components
  const renderTabButton = (tab: 'details' | 'photos' | 'documents', label: string, icon: React.ReactNode) => (
    <Button
      type="button"
      variant={activeTab === tab ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(tab)}
      className="flex-1 flex items-center gap-2"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  return (
    <form action={handleAction} className="space-y-4">
      {/* Mobile Tab Navigation */}
      {isMobile && (
        <div className="grid w-full grid-cols-3 mb-4 bg-muted rounded-md p-1">
          {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
          {renderTabButton('photos', 'Photos', <Camera className="h-4 w-4" />)}
          {renderTabButton('documents', 'Documents', <FileText className="h-4 w-4" />)}
        </div>
      )}

      {/* Details Tab */}
      {(!isMobile || activeTab === 'details') && (
        <div className="space-y-4">
          {isMobile && <h3 className="text-lg font-medium mb-3">Vehicle Details</h3>}
          
          {/* Basic Vehicle Info */}
          <div>
            <label className="block text-sm font-medium mb-1">Brand *</label>
            <input
              type="text"
              name="brand"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. Toyota, Caterpillar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model *</label>
            <input
              type="text"
              name="model"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. Hilux, 320D"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              name="type"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select type</option>
              <option value="Truck">Truck</option>
              <option value="Car">Car</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="Heavy Equipment">Heavy Equipment</option>
              <option value="Van">Van</option>
              <option value="Bus">Bus</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Plate Number *</label>
            <input
              type="text"
              name="plateNumber"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. ABC-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Owner *</label>
            <input
              type="text"
              name="owner"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Owner name"
            />
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Project *</label>
            <select
              name="projectId"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status *</label>
            <select
              name="status"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              defaultValue="OPERATIONAL"
            >
              <option value="OPERATIONAL">Operational</option>
              <option value="NON_OPERATIONAL">Non-Operational</option>
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium mb-1">Inspection Date *</label>
            <input
              type="date"
              name="inspectionDate"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date *</label>
            <input
              type="date"
              name="expiryDate"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Inspection Frequency (months) *</label>
            <input
              type="number"
              name="before"
              required
              min="1"
              max="12"
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="6"
              defaultValue="6"
            />
          </div>

          {/* Optional Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              name="remarks"
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Optional remarks or notes"
            />
          </div>
        </div>
      )}

      {/* Photos Tab */}
      {(!isMobile || activeTab === 'photos') && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Vehicle Images {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload clear photos of your vehicle from different angles. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Take photos in good lighting and ensure license plates and identification numbers are visible.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUploadSectionSimple
                    label="Front View"
                    accept="image/*"
                    onFileChange={handleFileChange('frontImg')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.frontImg}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Back View"
                    accept="image/*"
                    onFileChange={handleFileChange('backImg')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.backImg}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Side View 1"
                    accept="image/*"
                    onFileChange={handleFileChange('side1Img')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.side1Img}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Side View 2"
                    accept="image/*"
                    onFileChange={handleFileChange('side2Img')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.side2Img}
                    icon={<Upload className="h-4 w-4" />}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {(!isMobile || activeTab === 'documents') && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload important vehicle documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    📋 <strong>Document Requirements:</strong> Ensure all documents are clear, legible, and up-to-date. 
                    Blurred or expired documents may not be accepted for regulatory compliance.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="Original Receipt (OR)"
                      accept=".pdf,image/*"
                      onFileChange={handleFileChange('originalReceipt')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.originalReceipt}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Proof of purchase document</p>
                  </div>
                  
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="Car Registration (CR)"
                      accept=".pdf,image/*"
                      onFileChange={handleFileChange('carRegistration')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.carRegistration}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Official vehicle registration certificate</p>
                  </div>
                  
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      accept="image/*"
                      onFileChange={handleFileChange('pgpcInspection')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.pgpcInspection}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Philippine Government Permit Certificate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
        <div className="flex-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}