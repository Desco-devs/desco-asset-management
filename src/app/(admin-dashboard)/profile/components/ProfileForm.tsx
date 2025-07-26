"use client";

import { useRef, useState } from "react";
import { User } from "@/types/auth";
import { ProfileFormData } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Camera, Upload, X, Eye, AlertCircle } from "lucide-react";
import { color } from "@/lib/color";
import ImagePreviewModal from "@/app/components/custom-reusable/modal/PreviewImage";
import { useUpdateProfileWithImage } from "@/hooks/useProfileQuery";
import { 
  useProfileFormState, 
  useProfileImageState,
  useSetFieldValue,
  useSetFieldTouched,
  useSetSelectedFile,
  useClearImage,
  useMarkAsClean
} from "@/stores/profileStore";
import { toast } from "sonner";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  // State from store
  const { formData, errors, touched, isDirty, isValid } = useProfileFormState();
  const { selectedFile, previewUrl, isUploading } = useProfileImageState();
  
  // Actions from store
  const setFieldValue = useSetFieldValue();
  const setFieldTouched = useSetFieldTouched();
  const setSelectedFile = useSetSelectedFile();
  const clearImage = useClearImage();
  const markAsClean = useMarkAsClean();
  
  // Mutation for updating profile with custom onSuccess
  const updateProfileMutation = useUpdateProfileWithImage();
  
  // Generate initials from full name
  const initials = formData.full_name
    ? formData.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  // Get current image to display (preview or current profile image)
  const currentImageUrl = previewUrl || formData.user_profile || null;

  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    setFieldValue(field, value);
  };

  const handleFieldBlur = (field: keyof ProfileFormData) => {
    setFieldTouched(field, true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    // Set selected file and create preview
    setSelectedFile(file);
  };

  const handleRemoveImage = () => {
    clearImage();
    setFieldValue('user_profile', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    try {
      const profileData = {
        username: formData.username,
        full_name: formData.full_name,
        phone: formData.phone || null,
        user_profile: formData.user_profile || null,
      };

      await updateProfileMutation.mutateAsync({
        profileData,
        imageFile: selectedFile || undefined,
      });
      
      // Clear selected file and mark form as clean after successful update
      if (selectedFile) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      
      // Mark form as clean so user can make new changes
      markAsClean();
      
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Profile update error:", error);
    }
  };

  const isLoading = updateProfileMutation.isPending || isUploading;
  const hasChanges = isDirty || !!selectedFile;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div 
              className={`relative ${currentImageUrl ? 'cursor-pointer' : ''}`}
              onClick={() => currentImageUrl && setShowImagePreview(true)}
            >
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentImageUrl || undefined} alt={formData.full_name} />
                <AvatarFallback className={`${color} text-lg`}>{initials}</AvatarFallback>
              </Avatar>
              {currentImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            {currentImageUrl && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                onClick={handleRemoveImage}
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex-1">
            <Label>Profile Image</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? "Change Image" : "Select Image"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={triggerFileInput}
                disabled={isLoading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {selectedFile 
                ? `Selected: ${selectedFile.name} - Click 'Save Changes' to upload`
                : "Select JPEG, PNG, or WebP images up to 5MB"
              }
            </p>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-1">
            Username
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => handleFieldChange("username", e.target.value)}
            onBlur={() => handleFieldBlur("username")}
            placeholder="Enter your username"
            className={errors.username && touched.username ? "border-destructive" : ""}
            disabled={isLoading}
          />
          {errors.username && touched.username && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.username}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This is your unique identifier. It must be unique across all users.
          </p>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-1">
            Full Name
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleFieldChange("full_name", e.target.value)}
            onBlur={() => handleFieldBlur("full_name")}
            placeholder="Enter your full name"
            className={errors.full_name && touched.full_name ? "border-destructive" : ""}
            disabled={isLoading}
          />
          {errors.full_name && touched.full_name && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.full_name}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Your display name as it appears throughout the application.
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            onBlur={() => handleFieldBlur("phone")}
            placeholder="Enter your phone number"
            className={errors.phone && touched.phone ? "border-destructive" : ""}
            disabled={isLoading}
          />
          {errors.phone && touched.phone && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.phone}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Optional. Used for contact and notifications.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {hasChanges && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                Unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              type="submit" 
              disabled={!hasChanges || !isValid || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Image Preview Modal */}
      {currentImageUrl && (
        <ImagePreviewModal
          src={currentImageUrl}
          isOpen={showImagePreview}
          onOpenChange={setShowImagePreview}
        />
      )}
    </>
  );
}