import { useState, useCallback } from 'react'

/**
 * Dialog Manager Hook - Recommended Pattern for Dialog Management
 * 
 * This hook provides a clean, predictable way to manage multiple dialogs
 * without the complexity of state machines. Each dialog gets its own boolean state.
 * 
 * Features:
 * - Simple boolean state for each dialog
 * - Automatic cleanup on close
 * - Type-safe dialog identifiers
 * - Callback support for dialog actions
 * - Easy debugging and testing
 */

export type DialogId = 
  | 'main'
  | 'edit' 
  | 'create'
  | 'delete-confirm'
  | 'success'
  | 'error'
  | 'settings'
  | 'details'
  | 'export'

interface DialogState {
  [key: string]: boolean
}

interface DialogCallbacks {
  onOpen?: (dialogId: DialogId) => void
  onClose?: (dialogId: DialogId) => void
  onConfirm?: (dialogId: DialogId) => void
  onCancel?: (dialogId: DialogId) => void
}

export const useDialogManager = (callbacks?: DialogCallbacks) => {
  const [dialogs, setDialogs] = useState<DialogState>({})

  // Check if a specific dialog is open
  const isOpen = useCallback((dialogId: DialogId): boolean => {
    return Boolean(dialogs[dialogId])
  }, [dialogs])

  // Open a specific dialog
  const open = useCallback((dialogId: DialogId) => {
    setDialogs(prev => ({ ...prev, [dialogId]: true }))
    callbacks?.onOpen?.(dialogId)
  }, [callbacks])

  // Close a specific dialog
  const close = useCallback((dialogId: DialogId) => {
    setDialogs(prev => ({ ...prev, [dialogId]: false }))
    callbacks?.onClose?.(dialogId)
  }, [callbacks])

  // Close all dialogs
  const closeAll = useCallback(() => {
    setDialogs({})
    // Call onClose for each open dialog
    Object.entries(dialogs).forEach(([dialogId, isOpen]) => {
      if (isOpen) {
        callbacks?.onClose?.(dialogId as DialogId)
      }
    })
  }, [dialogs, callbacks])

  // Toggle a dialog state
  const toggle = useCallback((dialogId: DialogId) => {
    if (isOpen(dialogId)) {
      close(dialogId)
    } else {
      open(dialogId)
    }
  }, [isOpen, open, close])

  // Confirm action (typically for delete/destructive actions)
  const confirm = useCallback((dialogId: DialogId) => {
    callbacks?.onConfirm?.(dialogId)
    close(dialogId)
  }, [callbacks, close])

  // Cancel action
  const cancel = useCallback((dialogId: DialogId) => {
    callbacks?.onCancel?.(dialogId)
    close(dialogId)
  }, [callbacks, close])

  // Get count of open dialogs (useful for debugging)
  const openCount = Object.values(dialogs).filter(Boolean).length

  // Check if any dialog is open
  const hasOpenDialogs = openCount > 0

  // Get list of open dialog IDs
  const openDialogs = Object.entries(dialogs)
    .filter(([_, isOpen]) => isOpen)
    .map(([dialogId]) => dialogId as DialogId)

  return {
    // State checkers
    isOpen,
    hasOpenDialogs,
    openCount,
    openDialogs,
    
    // Actions
    open,
    close,
    closeAll,
    toggle,
    confirm,
    cancel,
    
    // Convenience methods for common patterns
    openMain: () => open('main'),
    openEdit: () => open('edit'),
    openCreate: () => open('create'),
    openDeleteConfirm: () => open('delete-confirm'),
    openSuccess: () => open('success'),
    openError: () => open('error'),
    
    closeMain: () => close('main'),
    closeEdit: () => close('edit'),
    closeCreate: () => close('create'),
    closeDeleteConfirm: () => close('delete-confirm'),
    closeSuccess: () => close('success'),
    closeError: () => close('error'),
  }
}

/**
 * Usage Examples:
 * 
 * // Basic usage
 * const dialog = useDialogManager()
 * 
 * <Dialog open={dialog.isOpen('main')} onOpenChange={(open) => open ? dialog.open('main') : dialog.close('main')}>
 *   <Button onClick={dialog.openEdit}>Edit</Button>
 * </Dialog>
 * 
 * <Dialog open={dialog.isOpen('edit')} onOpenChange={(open) => open ? dialog.open('edit') : dialog.close('edit')}>
 *   <Button onClick={dialog.closeEdit}>Cancel</Button>
 * </Dialog>
 * 
 * // With callbacks
 * const dialog = useDialogManager({
 *   onOpen: (id) => console.log(`Opened ${id}`),
 *   onClose: (id) => console.log(`Closed ${id}`),
 *   onConfirm: (id) => {
 *     if (id === 'delete-confirm') {
 *       handleDelete()
 *     }
 *   }
 * })
 * 
 * // Delete confirmation pattern
 * <Button onClick={dialog.openDeleteConfirm}>Delete</Button>
 * <Dialog open={dialog.isOpen('delete-confirm')}>
 *   <Button onClick={() => dialog.confirm('delete-confirm')}>Confirm Delete</Button>
 *   <Button onClick={() => dialog.cancel('delete-confirm')}>Cancel</Button>
 * </Dialog>
 */