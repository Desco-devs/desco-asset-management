'use client'

interface UserHeaderProps {
  total?: number
}

export function UserHeader({ total }: UserHeaderProps) {
  return (
    <div>
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Users Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs md:text-base">
            Manage system users and their permissions
          </p>
        </div>
      </div>
    </div>
  )
}