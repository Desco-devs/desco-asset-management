"use client";

import { Button } from "@/components/ui/button";
"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useClients,
  useCreateProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/api/use-projects";
import type { Project } from "@/types/projects";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
} from "@/components/ui/select";
import {
  useClients,
  useCreateProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/api/use-projects";
import type { Project } from "@/types/projects";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name too long"),
  clientId: z.string().min(1, "Client is required"),
});
});

type ProjectFormData = z.infer<typeof projectSchema>;
type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  project?: Project | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({
  project,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { data: projects } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();

  const isEditing = !!project;
  const isPending = isCreating || isUpdating;
export function ProjectForm({
  project,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { data: projects } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();

  const isEditing = !!project;
  const isPending = isCreating || isUpdating;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      clientId: project?.client_id || "",
      name: project?.name || "",
      clientId: project?.client_id || "",
    },
  });


  // Check for duplicate project names within same client
  const isDuplicateProject = (name: string, clientId: string): boolean => {
    if (!projects) return false;

    return projects.some(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.client_id === clientId &&
        (!isEditing || p.id !== project?.id)
    );
  };
    if (!projects?.data) return false;

    return projects.data.some(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.client_id === clientId &&
        (!isEditing || p.id !== project?.id)
    );
  };

  const onSubmit = (data: ProjectFormData) => {
    // Check for duplicates
    if (isDuplicateProject(data.name, data.clientId)) {
      form.setError("name", {
        message: "A project with this name already exists for this client",
      });
      return;
      form.setError("name", {
        message: "A project with this name already exists for this client",
      });
      return;
    }

    if (isEditing && project) {
      updateProject(
        { id: project.id, name: data.name, client_id: data.clientId },
        {
          onSuccess: () => {
            toast.success("Project updated successfully");
            onSuccess?.();
            toast.success("Project updated successfully");
            onSuccess?.();
          },
          onError: (error) => {
            toast.error("Failed to update project: " + error.message);
          },
            toast.error("Failed to update project: " + error.message);
          },
        }
      );
      );
    } else {
      createProject(
        { name: data.name, client_id: data.clientId },
        {
          onSuccess: () => {
            toast.success("Project created successfully");
            form.reset();
            onSuccess?.();
            toast.success("Project created successfully");
            form.reset();
            onSuccess?.();
          },
          onError: (error) => {
            toast.error("Failed to create project: " + error.message);
          },
            toast.error("Failed to create project: " + error.message);
          },
        }
      );
      );
    }
  };
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter project name..."
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending}
              >
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientsLoading ? (
                    <SelectItem value="" disabled>
                      Loading clients...
                    </SelectItem>
                  ) : clients?.length ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.location && (
                          <span className="text-muted-foreground ml-2">
                            ({client.location.address})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No clients available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update Project"
              : "Create Project"}
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update Project"
              : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
  );
}

