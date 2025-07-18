"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import DataTable, { Column } from "@/app/components/custom-reusable/table/ReusableTable"
import AlertModal from "@/app/components/custom-reusable/modal/AlertModal"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

import { useAuth } from "@/app/context/AuthContext"
import { User } from "@/types/auth"
import { createUser, deleteUser, getUsers, updateUser } from "@/app/service/user/user-service"
import { Button } from "@/components/ui/button"
import EditUserModal from "./modal/editUser"
import AddUserModal from "./modal/addUser"

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null)
  const [savingUid, setSavingUid] = useState<string | null>(null)

  // Delete modal
  const [alertOpen, setAlertOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Permissions
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN'
  const canUpdate = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN'
  const canDelete = currentUser?.role === 'SUPERADMIN'
  const canView = currentUser?.role === 'VIEWER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN'

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoadingData(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      toast.error("Failed to fetch users")
    } finally {
      setLoadingData(false)
    }
  }

  async function handleCreate(data: {
    username: string
    password: string
    fullname: string
    phone?: string | null
    role: string
    userStatus: string
  }) {
    try {
      const created = await createUser(data)
      setUsers((prev) => [created, ...prev])
      toast.success("User created successfully")
      setAddModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to create user")
    }
  }

  async function handleSaveEdit(uid: string, data: Partial<User>) {
    setSavingUid(uid)
    try {
      const updated = await updateUser(uid, data)
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, ...updated } : u))
      )
      toast.success("User updated successfully")
      setEditModalOpen(false)
      setEditingUser(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to update user")
    } finally {
      setSavingUid(null)
    }
  }

  function confirmDelete(user: User) {
    setUserToDelete(user)
    setAlertOpen(true)
  }

  async function handleDelete() {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete.id!)
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      toast.success("User deleted successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user")
    } finally {
      setAlertOpen(false)
      setUserToDelete(null)
    }
  }

  const columns: Column<User>[] = [
    { key: "username", title: "Username", render: (_v, u) => u.username },
    { key: "full_name", title: "Fullname", render: (_v, u) => u.full_name },
    { key: "phone", title: "Phone", render: (_v, u) => u.phone || "-" },
    {
      key: "role",
      title: "Role",
      render: (_v, u) => {
        const roleColors = {
          VIEWER: "bg-blue-500",
          ADMIN: "bg-yellow-500",
          SUPERADMIN: "bg-red-500",
        }
        const roleColor = roleColors[u.role as keyof typeof roleColors] || "bg-gray-500"
        return (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${roleColor}`} />
            {u.role || "VIEWER"}
          </div>
        )
      },
    },
    { key: "user_status", title: "Status", render: (_v, u) => u.user_status },
    {
      key: "actions",
      title: "Actions",
      className: "text-right",
      render: (_v, u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canUpdate && (
              <DropdownMenuItem
                onClick={() => {
                  setEditingUser(u)
                  setEditModalOpen(true)
                }}
              >
                Edit
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem className="text-red-600" onClick={() => confirmDelete(u)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <div className="py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Users</h1>
          {canCreate && (
            <Button onClick={() => setAddModalOpen(true)}>Add User</Button>
          )}
        </div>

        <DataTable<User>
          data={users}
          columns={columns}
          loading={loadingData}
          refreshing={refreshing}
          searchable
          sortable
          pagination
          onRefresh={async () => {
            setRefreshing(true)
            try {
              const fresh = await getUsers()
              setUsers(fresh)
            } catch {
              toast.error("Failed to refresh users")
            } finally {
              setRefreshing(false)
            }
          }}
        />
      </div>

      <AddUserModal
        isOpen={addModalOpen}
        onOpenChange={setAddModalOpen}
        onCreate={handleCreate}
        creating={false}
      />

      <EditUserModal
        isOpen={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={editingUser}
        onSave={handleSaveEdit}
        saving={savingUid !== null}
      />

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete User"
        description={`Are you sure you want to delete user "${userToDelete?.username}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
      />
    </>
  )
}
