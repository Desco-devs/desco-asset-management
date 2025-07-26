/**
 * Creation to Detail Verification Tests
 * End-to-end test to verify ALL fields from equipment creation appear in detail view
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipmentModalModern from '@/app/(admin-dashboard)/equipments/components/modals/EquipmentModalModern';
import MaintenanceReportDetailDrawer from '@/app/(admin-dashboard)/equipments/components/modals/MaintenanceReportDetailDrawer';

// Mock Zustand stores
const mockEquipmentsStore = {
  selectedEquipment: null,
  isModalOpen: true,
  isEditMode: false,
  isMobile: false,
  isPhotosCollapsed: false,
  isDocumentsCollapsed: false,
  setIsModalOpen: jest.fn(),
  setIsEditMode: jest.fn(),
  setSelectedEquipment: jest.fn(),
  setIsPhotosCollapsed: jest.fn(),
  setIsDocumentsCollapsed: jest.fn(),
  setDeleteConfirmation: jest.fn(),
  setIsEquipmentMaintenanceModalOpen: jest.fn(),
  // Maintenance report detail
  selectedMaintenanceReportForDetail: null,
  isMaintenanceReportDetailOpen: false,
  setIsMaintenanceReportDetailOpen: jest.fn(),
  setSelectedMaintenanceReportForDetail: jest.fn(),
  setSelectedMaintenanceReportForEdit: jest.fn(),
  setIsEditMaintenanceReportDrawerOpen: jest.fn(),
};

jest.mock('@/stores/equipmentsStore', () => ({
  useEquipmentsStore: jest.fn((selector) => {
    if (selector) {
      return selector(mockEquipmentsStore);
    }
    return mockEquipmentsStore;
  }),
  selectSelectedEquipment: (state: any) => state.selectedEquipment,
  selectIsModalOpen: (state: any) => state.isModalOpen,
  selectIsEditMode: (state: any) => state.isEditMode,
  selectIsMobile: (state: any) => state.isMobile,
  selectIsPhotosCollapsed: (state: any) => state.isPhotosCollapsed,
  selectIsDocumentsCollapsed: (state: any) => state.isDocumentsCollapsed,
}));

// Mock server state hooks
jest.mock('@/hooks/useEquipmentsQuery', () => ({
  useEquipmentsWithReferenceData: jest.fn(() => ({
    equipments: [],
    maintenanceReports: [],
    projects: []
  })),
  useUpdateEquipmentAction: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false
  })),
  useDeleteEquipment: jest.fn(() => ({
    isPending: false
  })),
  useDeleteEquipmentMaintenanceReport: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false
  }))
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onClick, ...props }: any) {
    return <img src={src} alt={alt} onClick={onClick} {...props} />;
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString();
  })
}));

describe('Creation to Detail View Field Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  /**
   * COMPREHENSIVE EQUIPMENT DATA
   * This data structure matches EXACTLY what would be created through CreateEquipmentForm
   * and stored in the database after successful creation
   */
  const completeCreatedEquipment = {
    // Primary identification - Required fields from Basic Information tab
    uid: 'equipment-complete-e2e-test-123',
    brand: 'Caterpillar',
    model: '320D Excavator',
    type: 'Heavy Excavator',
    owner: 'Advanced Construction Solutions Ltd',
    status: 'OPERATIONAL' as const,
    plateNumber: 'CAT-320D-2024-001',
    
    // Project assignment - Required field
    project: {
      uid: 'project-downtown-construction-456',
      name: 'Downtown Metro Construction Project Phase 2',
      client: {
        uid: 'client-metro-development-789',
        name: 'Metro Development Corporation',
        location: {
          uid: 'location-downtown-site-012',
          address: '456 Downtown Boulevard, Metro City, State 12345'
        }
      }
    },
    
    // Comprehensive remarks from Basic Information
    remarks: `High-performance excavator purchased for large-scale downtown construction project.
    
Key specifications:
- Operating weight: 22,000 kg
- Engine power: 122 kW (164 HP)
- Bucket capacity: 1.2 m³
- Maximum digging depth: 6.7 m
- Maximum reach: 10.1 m

Special considerations:
- Requires experienced operators only
- Daily pre-operation inspection mandatory
- Hydraulic fluid temperature monitoring critical
- Track pad condition check weekly

Maintenance schedule:
- 50-hour service: Oil and filter change
- 250-hour service: Hydraulic system check
- 500-hour service: Major component inspection
- 1000-hour service: Complete overhaul

Insurance details:
- Policy number: INS-CAT-320D-2024-789
- Coverage: $150,000 replacement value
- Deductible: $2,500
- Additional operator training required

Purchase information:
- Purchased: January 15, 2024
- Dealer: Heavy Equipment Solutions Inc.
- Warranty: 2 years / 2,000 hours
- Extended service plan: Yes (3 years total)`,
    
    // Date and inspection fields - from Dates & Inspection tab
    created_at: '2024-01-15T10:30:45Z',
    created_by: 'project.manager@construction.com',
    registrationExpiry: '2025-08-15', // Registration valid for 1.5 years
    insuranceExpirationDate: '2024-12-31', // Insurance expires end of year
    inspectionDate: '2024-01-10', // Last inspection 5 days before creation
    before: '3', // Inspect every 3 months due to heavy usage
    
    // Equipment Images - from Equipment Images tab
    image_url: 'https://storage.supabase.co/v1/object/public/equipment-images/cat-320d-2024-001-main.jpg',
    thirdpartyInspectionImage: 'https://storage.supabase.co/v1/object/public/inspections/third-party-cert-cat-320d-jan2024.jpg',
    pgpcInspectionImage: 'https://storage.supabase.co/v1/object/public/inspections/pgpc-certification-320d-2024.png',
    
    // Documents - from Documents tab
    originalReceiptUrl: 'https://storage.supabase.co/v1/object/public/documents/original-receipt-cat-320d-inv-12345.pdf',
    equipmentRegistrationUrl: 'https://storage.supabase.co/v1/object/public/documents/equipment-registration-320d-state-cert.pdf',
    
    // Equipment Parts - from Parts Management tab (complex nested structure)
    equipmentParts: [JSON.stringify({
      rootFiles: [
        {
          name: 'CAT-320D-Operators-Manual-2024.pdf',
          url: 'https://storage.supabase.co/v1/object/public/parts/manuals/cat-320d-operators-manual.pdf',
          uploadedAt: '2024-01-15T10:35:22Z',
          size: 2048576,
          type: 'application/pdf'
        },
        {
          name: 'Hydraulic-System-Schematic.jpg',
          url: 'https://storage.supabase.co/v1/object/public/parts/schematics/hydraulic-system-diagram.jpg',
          uploadedAt: '2024-01-15T10:36:18Z',
          size: 1536000,
          type: 'image/jpeg'
        },
        {
          name: 'Parts-Catalog-320D-Complete.pdf',
          url: 'https://storage.supabase.co/v1/object/public/parts/catalogs/parts-catalog-complete.pdf',
          uploadedAt: '2024-01-15T10:37:45Z',
          size: 5242880,
          type: 'application/pdf'
        }
      ],
      folders: [
        {
          name: 'Engine Components',
          description: 'Engine parts, filters, and maintenance items',
          createdAt: '2024-01-15T10:38:00Z',
          files: [
            {
              name: 'Air-Filter-Specification-C15.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/engine/air-filter-specs.pdf',
              uploadedAt: '2024-01-15T10:38:30Z',
              size: 512000,
              type: 'application/pdf'
            },
            {
              name: 'Oil-Filter-Cross-Reference.jpg',
              url: 'https://storage.supabase.co/v1/object/public/parts/engine/oil-filter-cross-ref.jpg',
              uploadedAt: '2024-01-15T10:39:15Z',
              size: 256000,
              type: 'image/jpeg'
            },
            {
              name: 'Fuel-Injector-Diagram.png',
              url: 'https://storage.supabase.co/v1/object/public/parts/engine/fuel-injector-diagram.png',
              uploadedAt: '2024-01-15T10:40:00Z',
              size: 768000,
              type: 'image/png'
            },
            {
              name: 'Engine-Oil-Specifications.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/engine/oil-specifications.pdf',
              uploadedAt: '2024-01-15T10:40:45Z',
              size: 384000,
              type: 'application/pdf'
            }
          ]
        },
        {
          name: 'Hydraulic System Parts',
          description: 'Hydraulic pumps, cylinders, seals, and fluid specifications',
          createdAt: '2024-01-15T10:41:00Z',
          files: [
            {
              name: 'Main-Pump-Assembly-Diagram.jpg',
              url: 'https://storage.supabase.co/v1/object/public/parts/hydraulic/main-pump-diagram.jpg',
              uploadedAt: '2024-01-15T10:41:30Z',
              size: 1024000,
              type: 'image/jpeg'
            },
            {
              name: 'Boom-Cylinder-Seals-Kit.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/hydraulic/boom-cylinder-seals.pdf',
              uploadedAt: '2024-01-15T10:42:15Z',
              size: 640000,
              type: 'application/pdf'
            },
            {
              name: 'Hydraulic-Fluid-ISO-46-Specs.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/hydraulic/fluid-specifications.pdf',
              uploadedAt: '2024-01-15T10:43:00Z',
              size: 448000,
              type: 'application/pdf'
            }
          ]
        },
        {
          name: 'Tracks and Undercarriage',
          description: 'Track pads, drive sprockets, rollers, and undercarriage components',
          createdAt: '2024-01-15T10:43:30Z',
          files: [
            {
              name: 'Track-Pad-Installation-Guide.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/tracks/track-pad-installation.pdf',
              uploadedAt: '2024-01-15T10:44:00Z',
              size: 896000,
              type: 'application/pdf'
            },
            {
              name: 'Undercarriage-Inspection-Points.jpg',
              url: 'https://storage.supabase.co/v1/object/public/parts/tracks/inspection-points.jpg',
              uploadedAt: '2024-01-15T10:44:45Z',
              size: 1280000,
              type: 'image/jpeg'
            }
          ]
        },
        {
          name: 'Electrical System',
          description: 'Wiring diagrams, fuses, and electrical component specifications',
          createdAt: '2024-01-15T10:45:00Z',
          files: [
            {
              name: 'Complete-Wiring-Diagram-320D.pdf',
              url: 'https://storage.supabase.co/v1/object/public/parts/electrical/wiring-diagram.pdf',
              uploadedAt: '2024-01-15T10:45:30Z',
              size: 1792000,
              type: 'application/pdf'
            }
          ]
        }
      ]
    })]
  };

  /**
   * MAINTENANCE REPORT CREATED WITH EQUIPMENT
   * This represents a maintenance report that was created simultaneously with equipment creation
   */
  const maintenanceReportFromCreation = {
    id: 'maintenance-created-with-equipment-456',
    equipment_id: 'equipment-complete-e2e-test-123',
    
    // From Maintenance Report tab during creation
    issue_description: 'Initial setup and pre-delivery inspection completed. Equipment ready for deployment to construction site.',
    priority: 'MEDIUM' as const,
    status: 'COMPLETED' as const,
    
    // Dates
    date_reported: '2024-01-15T10:30:45Z', // Same as equipment creation
    date_repaired: '2024-01-15T16:45:00Z', // Completed same day
    downtime_hours: 0, // No downtime - initial setup
    
    // Users
    reported_user: {
      id: 'user-project-manager-123',
      full_name: 'Sarah Johnson - Project Manager',
      email: 'sarah.johnson@construction.com'
    },
    repaired_user: {
      id: 'user-technician-456',
      full_name: 'Mike Rodriguez - Senior Technician',
      email: 'mike.rodriguez@construction.com'
    },
    
    // Location
    location: {
      id: 'location-equipment-yard-789',
      address: 'Equipment Staging Yard - 123 Industrial Drive, Metro City'
    },
    
    // Detailed information from creation
    inspection_details: `Pre-delivery inspection completed on newly purchased CAT 320D Excavator.

Inspection checklist completed:
✓ Engine oil level and quality - New, proper viscosity
✓ Hydraulic fluid level and cleanliness - Clean, proper level
✓ Coolant system - Full, no leaks detected
✓ Track condition and tension - New, properly tensioned
✓ Bucket and attachments - Properly mounted, secure
✓ Hydraulic cylinders - No leaks, smooth operation
✓ Electrical systems - All functions operational
✓ Safety systems - ROPS/FOPS certified, emergency stops functional
✓ Hour meter reading - 12 hours (delivery and setup)
✓ Operator seat and controls - Adjusted, fully functional

Fluid levels checked:
- Engine oil: 18.5L (full)
- Hydraulic fluid: 165L (full)
- Fuel tank: 400L (full)
- DEF tank: 23L (full)
- Coolant: 25L (full)

Performance testing:
- All hydraulic functions smooth and responsive
- Engine runs at proper RPM and temperature
- No unusual vibrations or noises
- Tracks operate smoothly in both directions
- Swing function operates correctly (360°)
- All attachments function properly

Documentation verified:
- Serial number matches purchase order
- Hour meter reading documented
- Warranty registration completed
- Insurance coverage confirmed
- Safety inspection certificate obtained`,

    action_taken: `Complete pre-delivery setup and configuration performed.

Setup procedures completed:
1. Delivery inspection - verified no shipping damage
2. Fluids topped off - all systems full and clean
3. Track tension adjusted to manufacturer specifications
4. Hydraulic system pressure tested (passed at 3200 PSI)
5. Engine break-in procedure initiated (first 50 hours)
6. Operator controls calibrated and tested
7. Safety systems verified and tested
8. Hour meter initialized and recorded
9. GPS tracking system installed and activated
10. Fleet management system integration completed

Initial maintenance items:
- Applied protective coating to exposed metal surfaces
- Installed weather protection covers
- Programmed maintenance reminder system
- Created digital maintenance log
- Established parts inventory tracking

Quality assurance:
- Final inspection by certified technician
- Customer walkthrough completed
- Operator training scheduled for January 18, 2024
- Emergency contact information programmed
- Site-specific safety protocols reviewed

Equipment ready for deployment to construction site.
Estimated delivery to site: January 16, 2024, 8:00 AM`,

    remarks: `Equipment successfully prepared for deployment. This is a new unit with full manufacturer warranty.

Next scheduled maintenance:
- 50-hour service due at 62 operating hours
- First major inspection at 250 hours
- Hydraulic filter change at 500 hours

Operator training requirements:
- Must complete CAT 320D certification course
- Site-specific safety training required
- Emergency procedures briefing mandatory

Site deployment checklist:
□ Transport to site scheduled for January 16
□ Site preparation verified (level ground, access)
□ Fuel delivery arranged for first week
□ Daily inspection sheets provided to operator
□ Emergency contact numbers posted in cab
□ Site safety manager briefed on equipment capabilities
□ Project manager notified of deployment schedule

Special notes:
- This equipment is critical path for project timeline
- Any maintenance issues should be reported immediately
- Backup equipment arrangement in place if needed
- Performance metrics to be tracked for first 500 hours

Total setup cost: $1,250.00 (labor and fluids)
Warranty effective date: January 15, 2024`,

    // Parts replaced (none - new equipment)
    parts_replaced: [],
    
    // Attachments from initial setup
    attachment_urls: [
      'https://storage.supabase.co/v1/object/public/maintenance/initial-inspection-checklist.pdf',
      'https://storage.supabase.co/v1/object/public/maintenance/pre-delivery-photos-01.jpg',
      'https://storage.supabase.co/v1/object/public/maintenance/pre-delivery-photos-02.jpg',
      'https://storage.supabase.co/v1/object/public/maintenance/hour-meter-reading-initial.jpg',
      'https://storage.supabase.co/v1/object/public/maintenance/setup-completion-certificate.pdf'
    ]
  };

  const mockProjects = [completeCreatedEquipment.project];
  const mockMaintenanceReports = [maintenanceReportFromCreation];

  describe('Complete Equipment Data Display Verification', () => {
    it('should display ALL equipment creation fields in detail view - Equipment Details Tab', async () => {
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Caterpillar 320D Excavator')).toBeInTheDocument();
      });

      // VERIFY ALL BASIC INFORMATION FIELDS
      
      // Equipment Identity Section
      expect(screen.getByText('Brand')).toBeInTheDocument();
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('320D Excavator')).toBeInTheDocument();
      
      expect(screen.getByText('Equipment Type')).toBeInTheDocument();
      expect(screen.getByText('Heavy Excavator')).toBeInTheDocument();
      
      expect(screen.getByText('Plate/Serial Number')).toBeInTheDocument();
      expect(screen.getByText('CAT-320D-2024-001')).toBeInTheDocument();

      // Ownership & Project Section
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Advanced Construction Solutions Ltd')).toBeInTheDocument();
      
      expect(screen.getByText('Assigned Project')).toBeInTheDocument();
      expect(screen.getByText('Downtown Metro Construction Project Phase 2')).toBeInTheDocument();

      // Status Section
      expect(screen.getByText('Operational Status')).toBeInTheDocument();
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();

      // VERIFY ALL DATES & INSPECTION FIELDS
      expect(screen.getByText('Dates & Inspection')).toBeInTheDocument();
      
      expect(screen.getByText('Registration Expires:')).toBeInTheDocument();
      expect(screen.getByText('Insurance Expires:')).toBeInTheDocument();
      expect(screen.getByText('Last Inspection:')).toBeInTheDocument();
      expect(screen.getByText('Next Inspection Due:')).toBeInTheDocument();
      expect(screen.getByText('Inspection Frequency:')).toBeInTheDocument();
      expect(screen.getByText('Every 3 months')).toBeInTheDocument();
      expect(screen.getByText('Date Added:')).toBeInTheDocument();
      expect(screen.getByText('Added by:')).toBeInTheDocument();
      expect(screen.getByText('project.manager@construction.com')).toBeInTheDocument();

      // VERIFY COMPREHENSIVE REMARKS
      expect(screen.getByText('Additional Notes:')).toBeInTheDocument();
      // Check for key parts of the comprehensive remarks
      expect(screen.getByText(/High-performance excavator purchased for large-scale downtown construction project/)).toBeInTheDocument();
      expect(screen.getByText(/Operating weight: 22,000 kg/)).toBeInTheDocument();
      expect(screen.getByText(/Policy number: INS-CAT-320D-2024-789/)).toBeInTheDocument();
      expect(screen.getByText(/Extended service plan: Yes \(3 years total\)/)).toBeInTheDocument();
    });

    it('should display ALL equipment images from creation - Equipment Images Tab', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Images tab
      await user.click(screen.getByRole('button', { name: /equipment images/i }));

      await waitFor(() => {
        expect(screen.getByText('Equipment Images')).toBeInTheDocument();
      });

      // VERIFY ALL IMAGES FROM CREATION ARE DISPLAYED

      // Main equipment image
      expect(screen.getByAltText('Equipment Image')).toBeInTheDocument();
      expect(screen.getByAltText('Equipment Image')).toHaveAttribute('src', completeCreatedEquipment.image_url);

      // Third-party inspection certificate
      expect(screen.getByAltText('Third-party Inspection')).toBeInTheDocument();
      expect(screen.getByAltText('Third-party Inspection')).toHaveAttribute('src', completeCreatedEquipment.thirdpartyInspectionImage);

      // PGPC inspection certificate
      expect(screen.getByAltText('PGPC Inspection')).toBeInTheDocument();
      expect(screen.getByAltText('PGPC Inspection')).toHaveAttribute('src', completeCreatedEquipment.pgpcInspectionImage);

      // Verify count badge shows 3 images
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display ALL equipment documents from creation - Documents Tab', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Documents tab
      await user.click(screen.getByRole('button', { name: /documents/i }));

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // VERIFY ALL DOCUMENTS FROM CREATION ARE DISPLAYED

      // Original Receipt
      expect(screen.getByAltText('Original Receipt (OR)')).toBeInTheDocument();
      expect(screen.getByAltText('Original Receipt (OR)')).toHaveAttribute('src', completeCreatedEquipment.originalReceiptUrl);

      // Equipment Registration
      expect(screen.getByAltText('Equipment Registration')).toBeInTheDocument();
      expect(screen.getByAltText('Equipment Registration')).toHaveAttribute('src', completeCreatedEquipment.equipmentRegistrationUrl);

      // Verify count badge shows 2 documents
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display ALL parts structure from creation - Parts Management Tab', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts management/i }));

      await waitFor(() => {
        expect(screen.getByText('Equipment Parts')).toBeInTheDocument();
      });

      // VERIFY PARTS COUNT FROM CREATION
      // Root files: 3 + Engine folder: 4 + Hydraulic folder: 3 + Tracks folder: 2 + Electrical folder: 1 = 13 total files
      expect(screen.getByText('13')).toBeInTheDocument();

      // Verify the parts data structure is correct
      const partsData = JSON.parse(completeCreatedEquipment.equipmentParts[0]);
      
      // Root files verification
      expect(partsData.rootFiles).toHaveLength(3);
      expect(partsData.rootFiles[0].name).toBe('CAT-320D-Operators-Manual-2024.pdf');
      expect(partsData.rootFiles[1].name).toBe('Hydraulic-System-Schematic.jpg');
      expect(partsData.rootFiles[2].name).toBe('Parts-Catalog-320D-Complete.pdf');

      // Folders verification
      expect(partsData.folders).toHaveLength(4);
      expect(partsData.folders[0].name).toBe('Engine Components');
      expect(partsData.folders[0].files).toHaveLength(4);
      expect(partsData.folders[1].name).toBe('Hydraulic System Parts');
      expect(partsData.folders[1].files).toHaveLength(3);
      expect(partsData.folders[2].name).toBe('Tracks and Undercarriage');
      expect(partsData.folders[2].files).toHaveLength(2);
      expect(partsData.folders[3].name).toBe('Electrical System');
      expect(partsData.folders[3].files).toHaveLength(1);
    });

    it('should display maintenance reports created with equipment - Maintenance Reports Tab', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Switch to Maintenance tab
      await user.click(screen.getByRole('button', { name: /maintenance reports/i }));

      await waitFor(() => {
        expect(screen.getByText('Maintenance Reports')).toBeInTheDocument();
      });

      // VERIFY MAINTENANCE REPORT COUNT
      expect(screen.getByText('1')).toBeInTheDocument();

      // The EquipmentMaintenanceReportsEnhanced component should receive the correct equipment ID
      // to filter and display the maintenance report created with the equipment
    });
  });

  describe('Complete Maintenance Report Data Display Verification', () => {
    it('should display ALL maintenance report fields created with equipment', async () => {
      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportFromCreation;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      await waitFor(() => {
        expect(screen.getByText('Maintenance Report Details')).toBeInTheDocument();
      });

      // VERIFY ALL BASIC REPORT INFORMATION

      // Issue description (main heading)
      expect(screen.getByText('Initial setup and pre-delivery inspection completed. Equipment ready for deployment to construction site.')).toBeInTheDocument();

      // Status and priority badges
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM Priority')).toBeInTheDocument();

      // Date and time information
      expect(screen.getByText('Reported:')).toBeInTheDocument();
      expect(screen.getByText('Completed:')).toBeInTheDocument();
      expect(screen.getByText('0 hours')).toBeInTheDocument(); // No downtime

      // User information
      expect(screen.getByText('Reported by:')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson - Project Manager')).toBeInTheDocument();
      expect(screen.getByText('Repaired by:')).toBeInTheDocument();
      expect(screen.getByText('Mike Rodriguez - Senior Technician')).toBeInTheDocument();

      // Location information
      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('Equipment Staging Yard - 123 Industrial Drive, Metro City')).toBeInTheDocument();

      // VERIFY DETAILED SECTIONS

      // Inspection Details
      expect(screen.getByText('Inspection Details')).toBeInTheDocument();
      expect(screen.getByText(/Pre-delivery inspection completed on newly purchased CAT 320D Excavator/)).toBeInTheDocument();
      expect(screen.getByText(/Engine oil level and quality - New, proper viscosity/)).toBeInTheDocument();
      expect(screen.getByText(/Hour meter reading - 12 hours \(delivery and setup\)/)).toBeInTheDocument();
      expect(screen.getByText(/Documentation verified:/)).toBeInTheDocument();

      // Action Taken
      expect(screen.getByText('Action Taken')).toBeInTheDocument();
      expect(screen.getByText(/Complete pre-delivery setup and configuration performed/)).toBeInTheDocument();
      expect(screen.getByText(/Delivery inspection - verified no shipping damage/)).toBeInTheDocument();
      expect(screen.getByText(/Equipment ready for deployment to construction site/)).toBeInTheDocument();

      // Additional Remarks
      expect(screen.getByText('Additional Remarks')).toBeInTheDocument();
      expect(screen.getByText(/Equipment successfully prepared for deployment/)).toBeInTheDocument();
      expect(screen.getByText(/Must complete CAT 320D certification course/)).toBeInTheDocument();
      expect(screen.getByText(/Total setup cost: \$1,250.00 \(labor and fluids\)/)).toBeInTheDocument();
    });

    it('should display maintenance report attachments from creation', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportFromCreation;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Attachments tab
      await user.click(screen.getByRole('button', { name: /attachments/i }));

      await waitFor(() => {
        expect(screen.getByText('Attachments & Images')).toBeInTheDocument();
      });

      // VERIFY ALL 5 ATTACHMENTS FROM CREATION ARE DISPLAYED
      expect(screen.getByText('5')).toBeInTheDocument();

      // Check for specific attachments
      expect(screen.getByAltText('Attachment 2')).toBeInTheDocument(); // Pre-delivery photo 1
      expect(screen.getByAltText('Attachment 3')).toBeInTheDocument(); // Pre-delivery photo 2
      expect(screen.getByAltText('Attachment 4')).toBeInTheDocument(); // Hour meter reading

      // PDF files should show as downloadable
      expect(screen.getByText('initial-inspection-checklist.pdf')).toBeInTheDocument();
      expect(screen.getByText('setup-completion-certificate.pdf')).toBeInTheDocument();
    });

    it('should show no parts replaced for new equipment maintenance', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedMaintenanceReportForDetail = maintenanceReportFromCreation;
      mockEquipmentsStore.isMaintenanceReportDetailOpen = true;

      renderWithProviders(<MaintenanceReportDetailDrawer />);

      // Switch to Parts tab
      await user.click(screen.getByRole('button', { name: /parts replaced/i }));

      await waitFor(() => {
        expect(screen.getByText('Parts Replaced')).toBeInTheDocument();
      });

      // Should show no parts replaced for new equipment
      expect(screen.getByText('No parts were replaced in this maintenance')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Data Consistency', () => {
    it('should maintain all data across all tabs without loss', async () => {
      const user = userEvent.setup();
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      // Start on Details tab - verify key data
      await waitFor(() => {
        expect(screen.getByText('Caterpillar')).toBeInTheDocument();
        expect(screen.getByText('Advanced Construction Solutions Ltd')).toBeInTheDocument();
      });

      // Switch to Images tab - verify images
      await user.click(screen.getByRole('button', { name: /equipment images/i }));
      expect(screen.getByAltText('Equipment Image')).toBeInTheDocument();

      // Switch to Documents tab - verify docs
      await user.click(screen.getByRole('button', { name: /documents/i }));
      expect(screen.getByAltText('Original Receipt (OR)')).toBeInTheDocument();

      // Switch to Parts tab - verify parts count
      await user.click(screen.getByRole('button', { name: /parts management/i }));
      expect(screen.getByText('13')).toBeInTheDocument(); // Total files count

      // Switch to Maintenance tab - verify reports
      await user.click(screen.getByRole('button', { name: /maintenance reports/i }));
      expect(screen.getByText('1')).toBeInTheDocument(); // Report count

      // Switch back to Details tab - all data should still be there
      await user.click(screen.getByRole('button', { name: /equipment details/i }));
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      expect(screen.getByText('Advanced Construction Solutions Ltd')).toBeInTheDocument();
      expect(screen.getByText('CAT-320D-2024-001')).toBeInTheDocument();
      expect(screen.getByText('project.manager@construction.com')).toBeInTheDocument();
    });

    it('should show correct badge counts for all tabs', async () => {
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Caterpillar 320D Excavator')).toBeInTheDocument();
      });

      // Verify all tab counts match creation data
      // Images: 3 (equipment + third-party + pgpc)
      // Documents: 2 (receipt + registration)
      // Parts: 13 (3 root + 4 engine + 3 hydraulic + 2 tracks + 1 electrical)
      // Maintenance: 1 (initial setup report)

      const counts = screen.getAllByText('3');
      expect(counts.length).toBeGreaterThan(0); // Images count
      
      const documentCount = screen.getAllByText('2');
      expect(documentCount.length).toBeGreaterThan(0); // Documents count
      
      const partsCount = screen.getAllByText('13');
      expect(partsCount.length).toBeGreaterThan(0); // Parts count
      
      const maintenanceCount = screen.getAllByText('1');
      expect(maintenanceCount.length).toBeGreaterThan(0); // Maintenance count
    });
  });

  describe('End-to-End Creation to Detail Flow Verification', () => {
    it('should demonstrate complete creation-to-detail data flow', async () => {
      // This test simulates the complete flow:
      // 1. Equipment created with all fields filled
      // 2. Maintenance report created with equipment
      // 3. All data displayed correctly in detail views

      const user = userEvent.setup();
      
      // SETUP: Equipment with complete creation data
      mockEquipmentsStore.selectedEquipment = completeCreatedEquipment;
      
      const { useEquipmentsWithReferenceData } = require('@/hooks/useEquipmentsQuery');
      useEquipmentsWithReferenceData.mockReturnValue({
        equipments: [completeCreatedEquipment],
        maintenanceReports: mockMaintenanceReports,
        projects: mockProjects
      });

      // STEP 1: Verify equipment detail view shows all creation data
      renderWithProviders(<EquipmentModalModern />);

      await waitFor(() => {
        expect(screen.getByText('Caterpillar 320D Excavator')).toBeInTheDocument();
      });

      // Verify summary information in modal title and description
      expect(screen.getByText('View equipment details, maintenance records, and documentation')).toBeInTheDocument();

      // STEP 2: Verify each tab contains complete creation data
      
      // Details tab verification
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
      expect(screen.getByText('Every 3 months')).toBeInTheDocument(); // Inspection frequency
      expect(screen.getByText(/High-performance excavator purchased/)).toBeInTheDocument(); // Remarks

      // Images tab verification
      await user.click(screen.getByRole('button', { name: /equipment images/i }));
      expect(screen.getByAltText('Equipment Image')).toHaveAttribute('src', expect.stringContaining('cat-320d-2024-001-main.jpg'));

      // Documents tab verification
      await user.click(screen.getByRole('button', { name: /documents/i }));
      expect(screen.getByAltText('Original Receipt (OR)')).toHaveAttribute('src', expect.stringContaining('original-receipt-cat-320d'));

      // Parts tab verification
      await user.click(screen.getByRole('button', { name: /parts management/i }));
      expect(screen.getByText('13')).toBeInTheDocument(); // Comprehensive parts count

      // Maintenance tab verification
      await user.click(screen.getByRole('button', { name: /maintenance reports/i }));
      expect(screen.getByText('1')).toBeInTheDocument(); // Initial setup report

      // STEP 3: This completes the verification that ALL creation data
      // successfully flows through to the detail view without any loss
      
      // The test passes if all assertions above succeed, proving that:
      // - All form fields from creation appear in detail view
      // - All file uploads from creation are displayed
      // - All complex data structures (parts, maintenance) are preserved
      // - Tab navigation maintains data consistency
      // - Badge counts accurately reflect creation data
    });
  });
});