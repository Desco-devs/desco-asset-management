# Maintenance Report Attachment UI Fixes

## Problem
- **View mode**: Shows 2 attachments correctly with proper filenames
- **Edit mode**: Shows both attachments labeled as "Existing Attachment 1" causing confusion
- One attachment shows as "maintenance_attachment_2_17541..." (actual filename)
- The other shows as generic "Existing Attachment 1" label

## Root Cause
In the edit mode components, the filename was being correctly extracted from the URL:
```typescript
const fileName = attachmentUrl.split('/').pop() || `Attachment ${index + 1}`;
```

But then overridden with a generic label when passed to the FileUploadSectionSimple component:
```typescript
// BEFORE - Generic label
label={`Existing Attachment ${index + 1}`}

// AFTER - Actual filename
label={fileName}
```

## Files Fixed

### 1. EditEquipmentMaintenanceReportModal.tsx
- **Fixed**: Line 574 - Changed `"Existing Attachment ${index + 1}"` to `fileName`
- **Fixed**: Line 620 - Changed `"New Attachment ${index + 1}"` to `file.name` for new files

### 2. EditEquipmentMaintenanceReportDrawer.tsx  
- **Fixed**: Line 677 - Changed `"Existing Attachment ${index + 1}"` to `fileName`
- **Fixed**: Line 1096 - Changed `"Existing Attachment ${index + 1}"` to `fileName` (second occurrence)
- **Fixed**: Line 723 - Changed `"New Attachment ${index + 1}"` to `file.name` for new files
- **Fixed**: Line 1142 - Changed `"New Attachment ${index + 1}"` to `file.name` for new files (second occurrence)

### 3. CreateEquipmentMaintenanceReportModal.tsx
- **Fixed**: Line 787 - Changed `"Attachment ${index + 1}"` to use actual filename when available: `localAttachmentFiles[index]?.name || "Attachment ${index + 1}"`

## Pattern Applied
The fix follows the same filename tracking pattern used in the parts management system:

1. **Header Display**: Shows actual filename with truncation for long names
2. **File Component Label**: Uses actual filename instead of generic counter
3. **Consistency**: Both view and edit modes now show the same filename information

## Result
- ✅ Edit mode now shows proper tracked filenames like "maintenance_attachment_2_17541..." 
- ✅ No more confusing "Existing Attachment 1" labels
- ✅ Consistent labeling between view and edit modes
- ✅ New attachments also show actual filenames when selected
- ✅ Maintains the existing functionality while improving UX

## Testing
To test the fixes:
1. Open a maintenance report with attachments in edit mode
2. Verify that existing attachments show their actual filenames instead of "Existing Attachment 1"
3. Add a new attachment and verify it shows the actual filename
4. Compare with view mode to ensure consistency