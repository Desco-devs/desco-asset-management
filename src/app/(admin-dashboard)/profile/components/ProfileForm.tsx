"use client";

import { useRef, useState, useEffect } from "react";
import { User } from "@/types/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Camera, Upload, X, Eye, AlertCircle, Edit, XIcon } from "lucide-react";
import { color } from "@/lib/color";
import ImagePreviewModal from "@/app/components/custom-reusable/modal/PreviewImage";
import { toast } from "sonner";

// Simple validation functions
const validateUsername = (value: string): string | null => {
  if (!value.trim()) return 'Username is required';
  if (value.length < 3) return 'Username must be at least 3 characters';
  if (value.length > 50) return 'Username must be less than 50 characters';
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, hyphens, and underscores';
  return null;
};

const validateFullName = (value: string): string | null => {
  if (!value.trim()) return 'Full name is required';
  if (value.length < 2) return 'Full name must be at least 2 characters';
  if (value.length > 100) return 'Full name must be less than 100 characters';
  return null;
};

const validatePhone = (value: string): string | null => {
  if (!value) return null; // Phone is optional
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.length === 0) return null; // Empty after cleaning is ok
  if (cleaned.startsWith('+')) {
    if (!/^\+\d{7,15}$/.test(cleaned)) return 'Phone must be + followed by 7-15 digits';
  } else {
    if (!/^\d{7,15}$/.test(cleaned)) return 'Phone must be 7-15 digits only';
  }
  return null;
};

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Simple form state
  const [formData, setFormData] = useState({
    username: user.username,
    full_name: user.full_name,
    phone: user.phone || '',
    user_profile: user.user_profile || '',
  });
  
  // Store original data for cancel functionality
  const [originalData, setOriginalData] = useState({
    username: user.username,
    full_name: user.full_name,
    phone: user.phone || '',
    user_profile: user.user_profile || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Initialize form data when user changes
  useEffect(() => {
    const newData = {
      username: user.username,
      full_name: user.full_name,
      phone: user.phone || '',
      user_profile: user.user_profile || '',
    };
    setFormData(newData);
    setOriginalData(newData);
  }, [user]);
  
  // Clean up preview URL when file changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);
  
  // Simple validation
  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    
    switch (field) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'full_name':
        error = validateFullName(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }));
    
    return error;
  };
  
  const isValid = Object.values(errors).every(error => !error) && 
                  formData.username.trim() && 
                  formData.full_name.trim();
  
  const hasChanges = 
    formData.username !== originalData.username ||
    formData.full_name !== originalData.full_name ||
    formData.phone !== originalData.phone ||
    !!selectedFile;
  
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

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  // Special handler for phone input to filter out non-numeric characters
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits, plus sign, spaces, hyphens, and parentheses for formatting
    const filtered = value.replace(/[^\d+\s\-()]/g, '');
    handleFieldChange('phone', filtered);
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
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

    setSelectedFile(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, user_profile: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    setFormData(originalData);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrors({});
    setTouched({});
    setIsEditing(false);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Simple API call for updating profile
  const updateProfile = async (profileData: any, imageFile?: File) => {
    let imageUrl = profileData.user_profile;
    
    // Upload image first if provided
    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      
      const uploadResponse = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload image');
      }
      
      const uploadResult = await uploadResponse.json();
      imageUrl = uploadResult.url;
    }
    
    // Then update profile
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profileData,
        user_profile: imageUrl,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    
    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    setIsLoading(true);
    
    try {
      const profileData = {
        username: formData.username,
        full_name: formData.full_name,
        phone: formData.phone || null,
        user_profile: formData.user_profile || null,
      };

      await updateProfile(profileData, selectedFile || undefined);
      
      // Update original data with new values
      setOriginalData(formData);
      
      // Clear selected file after successful update
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Exit edit mode
      setIsEditing(false);
      
      toast.success('Profile updated successfully!');
      
      // Refresh the page to get updated data
      window.location.reload();
      
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-3">
          <div 
            className={`relative inline-block ${currentImageUrl ? 'cursor-pointer' : ''}`}
            onClick={() => currentImageUrl && setShowImagePreview(true)}
          >
            <Avatar className="h-24 w-24 border-2 border-background shadow-md">
              <AvatarImage src={currentImageUrl || undefined} alt={formData.full_name} />
              <AvatarFallback className={`${color} text-2xl font-semibold`}>{initials}</AvatarFallback>
            </Avatar>
            {isEditing && currentImageUrl && !selectedFile && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {currentImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                <Eye className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{formData.full_name || 'Your Name'}</h2>
            <p className="text-sm text-muted-foreground">@{formData.username}</p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={user.role === 'SUPERADMIN' ? 'default' : user.role === 'ADMIN' ? 'secondary' : 'outline'} className="text-xs">
                {user.role}
              </Badge>
              <Badge variant={user.user_status === 'ACTIVE' ? 'default' : 'destructive'} className="text-xs">
                {user.user_status}
              </Badge>
            </div>
          </div>
          
          {/* Photo controls - only show in edit mode */}
          {isEditing && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="text-xs"
              >
                <Camera className="mr-2 h-3 w-3" />
                {selectedFile ? "Change Photo" : "Update Photo"}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} selected
                </p>
              )}
            </>
          )}
        </div>

        {!isEditing ? (
          /* VIEW MODE */
          <div className="space-y-6">
            {/* Profile Information Display */}
            <div className="space-y-4">
              <div className="grid gap-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <div className="h-11 px-3 py-2 border border-input bg-muted/30 rounded-md flex items-center">
                    <span className="text-sm">{formData.username}</span>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <div className="h-11 px-3 py-2 border border-input bg-muted/30 rounded-md flex items-center">
                    <span className="text-sm">{formData.full_name}</span>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                  <div className="h-11 px-3 py-2 border border-input bg-muted/30 rounded-md flex items-center">
                    <span className="text-sm">{formData.phone || 'Not provided'}</span>
                  </div>
                </div>

                {/* Email (readonly) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="h-11 px-3 py-2 border border-input bg-muted/30 rounded-md flex items-center">
                    <span className="text-sm">{user.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-4">
              <Button 
                onClick={handleEditClick}
                className="w-full h-11 font-medium"
                size="lg"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                onBlur={() => handleFieldBlur("username")}
                placeholder="Enter username"
                className={`h-11 ${errors.username && touched.username ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {errors.username && touched.username && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.username}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleFieldChange("full_name", e.target.value)}
                onBlur={() => handleFieldBlur("full_name")}
                placeholder="Enter full name"
                className={`h-11 ${errors.full_name && touched.full_name ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {errors.full_name && touched.full_name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={() => handleFieldBlur("phone")}
                placeholder="Enter phone number (digits only)"
                className={`h-11 ${errors.phone && touched.phone ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {errors.phone && touched.phone && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phone}
                </p>
              )}
            </div>


            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              {hasChanges && (
                <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  You have unsaved changes
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  type="submit" 
                  disabled={!hasChanges || !isValid || isLoading}
                  className="flex-1 h-11 font-medium"
                  size="lg"
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
                
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="flex-1 h-11 font-medium"
                  size="lg"
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

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