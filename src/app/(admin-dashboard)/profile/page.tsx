"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Save, Camera, Upload, X } from "lucide-react";
import { color } from "@/lib/color";

interface ProfileFormData {
  username: string;
  full_name: string;
  phone: string;
  user_profile: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    full_name: "",
    phone: "",
    user_profile: "",
  });

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        full_name: user.full_name || "",
        phone: user.phone || "",
        user_profile: user.user_profile || "",
      });
      setPreviewImage(user.user_profile);
    }
  }, [user]);

  // Generate initials from fullname
  const initials = formData.full_name
    ? formData.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

    // Store the file for later upload
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast.success("Image selected! Click 'Save Changes' to upload.");
  };

  const uploadImage = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const response = await fetch("/api/upload/profile-image", {
      method: "POST",  
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload image");
    }

    const { url } = await response.json();
    return url;
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setFormData(prev => ({
      ...prev,
      user_profile: ""
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let profileImageUrl = formData.user_profile;

      // Upload image if a new file was selected
      if (selectedFile) {
        toast.loading("Uploading image...", { id: "upload" });
        try {
          profileImageUrl = await uploadImage(selectedFile);
          toast.success("Image uploaded successfully!", { id: "upload" });
        } catch (uploadError) {
          toast.error("Failed to upload image", { id: "upload" });
          throw uploadError;
        }
      }

      // Update profile with form data
      toast.loading("Updating profile...", { id: "profile" });
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          full_name: formData.full_name,
          phone: formData.phone || null,
          user_profile: profileImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      // Clear selected file after successful upload
      setSelectedFile(null);
      
      // Refresh user data in context
      await refreshUser();
      toast.success("Profile updated successfully!", { id: "profile" });
      
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile", { id: "profile" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewImage || undefined} alt={formData.full_name} />
                  <AvatarFallback className={`${color} text-lg`}>{initials}</AvatarFallback>
                </Avatar>
                {previewImage && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveImage}
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
                    disabled={loading}
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
                    disabled={loading}
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is your unique identifier. It must be unique across all users.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Enter your full name"
                required
              />
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
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Used for contact and notifications.
              </p>
            </div>

            {/* Account Info (Read-only) */}
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-medium text-sm">Account Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <p className="font-medium capitalize">{user.role.toLowerCase()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{user.user_status.toLowerCase()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Member Since</Label>
                  <p className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p className="font-medium">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? (
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}