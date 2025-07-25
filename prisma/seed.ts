import {
  PrismaClient,
  report_priority,
  report_status,
  status,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Note: User seeding disabled - users will be created via Supabase Auth
  console.log("👤 User seeding disabled - users managed by Supabase Auth");

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log("🧹 Cleaning existing data...");
  await prisma.maintenance_equipment_report.deleteMany({});
  await prisma.maintenance_vehicle_report.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.location.deleteMany({});

  // Create locations
  console.log("📍 Creating locations...");
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        address: "TIWI, Albay",
        created_by: null,
      },
    }),
    prisma.location.create({
      data: {
        id: "c552165c-3edc-43c2-9fdb-bb622dfdb174",
        address: "Manila, Metro Manila",
        created_by: null,
      },
    }),
    prisma.location.create({
      data: {
        id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        address: "Cebu City, Cebu",
        created_by: null,
      },
    }),
    prisma.location.create({
      data: {
        id: "b2c3d4e5-f6a7-4901-bcde-f21234567891",
        address: "Davao City, Davao del Sur",
        created_by: null,
      },
    }),
  ]);

  // Create clients
  console.log("🏢 Creating clients...");
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        id: "328a447e-d3fb-4a36-a7a4-537064047444",
        name: "APRI (Asian Pacific Recycling Industries)",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        created_by: null,
      },
    }),
    prisma.client.create({
      data: {
        id: "bb386ce7-1ed8-4571-ab67-ac988845b301",
        name: "DESCO MAINTENANCE",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        created_by: null,
      },
    }),
    prisma.client.create({
      data: {
        id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        name: "PGPC (Philippine Geothermal Production Company)",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        created_by: null,
      },
    }),
    prisma.client.create({
      data: {
        id: "c81e566d-7681-4d80-9e06-c9ae8c28dce9",
        name: "Global Infrastructure Solutions",
        location_id: "c552165c-3edc-43c2-9fdb-bb622dfdb174",
        created_by: null,
      },
    }),
    prisma.client.create({
      data: {
        id: "d1e2f3a4-b5c6-4789-abcd-ef1234567892",
        name: "Cebu Mining Corporation",
        location_id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        created_by: null,
      },
    }),
    prisma.client.create({
      data: {
        id: "e2f3a4b5-c6d7-4890-bcde-f21234567893",
        name: "Mindanao Development Corp",
        location_id: "b2c3d4e5-f6a7-4901-bcde-f21234567891",
        created_by: null,
      },
    }),
  ]);

  // Create projects
  console.log("📋 Creating projects...");
  const projects = await Promise.all([
    // PGPC Projects
    prisma.project.create({
      data: {
        id: "01ede07d-b0d5-4d3f-be2c-88eb809b17c5",
        name: "PGPC BORING RIG OPERATIONS",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "0eefad71-bde7-4b96-9f09-b55497ca9706",
        name: "PGPC MECHANICAL MAINTENANCE",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        name: "PGPC DRILLING OPERATIONS",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "bb345517-1acc-41fc-be57-c0088f9e051e",
        name: "PGPC MONTHLY RENTAL",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "f806b292-2499-4ae8-b3b0-7426106a7b2b",
        name: "PGPC CIVIL CONSTRUCTION",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "a551252c-f76b-449b-9bf7-3d530e82db54",
        name: "PGPC WIRELINE SERVICES",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        created_by: null,
      },
    }),

    // DESCO Projects
    prisma.project.create({
      data: {
        id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
        name: "DESCO TIWI MAINTENANCE",
        client_id: "bb386ce7-1ed8-4571-ab67-ac988845b301",
        created_by: null,
      },
    }),

    // APRI Projects
    prisma.project.create({
      data: {
        id: "7e57f4bc-4c0e-4da6-9635-e0cf71e25827",
        name: "APRI MONTHLY RENTAL",
        client_id: "328a447e-d3fb-4a36-a7a4-537064047444",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "81d4cfa8-2ed3-49c4-bce0-406b27be3aa6",
        name: "BINARY PROJECT",
        client_id: "328a447e-d3fb-4a36-a7a4-537064047444",
        created_by: null,
      },
    }),

    // New Projects
    prisma.project.create({
      data: {
        id: "8c10d946-16a3-4628-af6c-3d6d56209f89",
        name: "Metro Infrastructure Development",
        client_id: "c81e566d-7681-4d80-9e06-c9ae8c28dce9",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "f3a4b5c6-d7e8-4901-cdef-123456789012",
        name: "Cebu Mining Expansion",
        client_id: "d1e2f3a4-b5c6-4789-abcd-ef1234567892",
        created_by: null,
      },
    }),
    prisma.project.create({
      data: {
        id: "a4b5c6d7-e8f9-4012-def1-234567890123",
        name: "Mindanao Port Development",
        client_id: "e2f3a4b5-c6d7-4890-bcde-f21234567893",
        created_by: null,
      },
    }),
  ]);

  // Create equipment
  console.log("⚙️ Creating equipment...");
  const equipment = await Promise.all([
    // Heavy Machinery
    prisma.equipment.create({
      data: {
        id: "0326d356-3cb7-4570-b3f6-9737629251cd",
        brand: "HELI",
        model: "CPCD35",
        type: "FORK LOADER",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/forklift-1.jpg",
        inspection_date: new Date("2025-06-11T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        equipment_parts: [],
        project_id: "7e57f4bc-4c0e-4da6-9635-e0cf71e25827",
        created_by: null,
      },
    }),
    prisma.equipment.create({
      data: {
        id: "4bfda437-e6e4-49cf-87b1-66a3a4d77115",
        brand: "DEVELON",
        model: "SD300",
        type: "WHEEL LOADER",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/loader-1.jpg",
        inspection_date: new Date("2025-07-03T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        before: 12,
        pgpc_inspection_image: "https://example.com/equipment/loader-pgpc-inspection.jpg",
        thirdparty_inspection_image: "https://example.com/equipment/loader-3rd-party.jpg",
        equipment_parts: [],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        created_by: null,
      },
    }),
    prisma.equipment.create({
      data: {
        id: "7e6b2374-1520-441a-ab13-6cf628e6929e",
        brand: "ZOOMLION",
        model: "ZRT900 90T",
        type: "ROUGH TERRAIN CRANE",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/crane-1.jpg",
        inspection_date: new Date("2025-07-03T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        before: 12,
        thirdparty_inspection_image: "https://example.com/equipment/crane-inspection.jpg",
        equipment_parts: ["https://example.com/equipment/crane-parts-1.jpg"],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        created_by: null,
      },
    }),
    prisma.equipment.create({
      data: {
        id: "87161b87-1bc9-43b3-b057-9c3672d857a5",
        brand: "ZOOMLION",
        model: "ZR320L",
        type: "BORING RIG",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/boring-rig-1.jpg",
        inspection_date: new Date("2025-01-11T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        thirdparty_inspection_image: "https://example.com/equipment/boring-rig-inspection.jpg",
        equipment_parts: [],
        project_id: "01ede07d-b0d5-4d3f-be2c-88eb809b17c5",
        created_by: null,
      },
    }),

    // Generators & Power Equipment
    prisma.equipment.create({
      data: {
        id: "08aacedf-9482-4699-951e-d31275037bac",
        brand: "KYOTO",
        model: "TL #6",
        type: "TOWER LIGHT",
        status: status.NON_OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/tower-light-1.jpg",
        remarks: "JUNE 23, 2025 - FOR INSPECTION / CHECKING\n\nOBSERVATION: Generator failure due to burn-out\nPOSSIBLE ROOT CAUSE: Damage to stator windings suspected, likely caused by prolonged overheating, internal short circuit, or excessive load conditions.",
        equipment_parts: [],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        created_by: null,
      },
    }),
    prisma.equipment.create({
      data: {
        id: "4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5",
        brand: "AIRMAN",
        model: "PDS390S",
        type: "COMPRESSOR",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/compressor-1.jpg",
        inspection_date: new Date("2025-06-01T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        equipment_parts: [],
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
        created_by: null,
      },
    }),

    // Trucks & Specialized Vehicles
    prisma.equipment.create({
      data: {
        id: "66ea7472-3587-4155-b817-f93122c3491d",
        brand: "FUSO",
        model: "FJ2528R",
        type: "VACUUM TRUCK",
        status: status.NON_OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/vacuum-truck-1.jpg",
        inspection_date: new Date("2025-06-02T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        plate_number: "CBS 2751",
        original_receipt_url: "https://example.com/equipment/vacuum-truck-receipt.jpg",
        equipment_parts: ["https://example.com/equipment/vacuum-truck-parts-1.jpg"],
        project_id: "bb345517-1acc-41fc-be57-c0088f9e051e",
        created_by: null,
      },
    }),

    // New Equipment
    prisma.equipment.create({
      data: {
        id: "b5c6d7e8-f9a0-4123-ef12-345678901234",
        brand: "CATERPILLAR",
        model: "320D",
        type: "EXCAVATOR",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/excavator-1.jpg",
        inspection_date: new Date("2025-07-15T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        project_id: "f3a4b5c6-d7e8-4901-cdef-123456789012",
        created_by: null,
      },
    }),
    prisma.equipment.create({
      data: {
        id: "c6d7e8f9-a0b1-4234-f123-456789012345",
        brand: "KOMATSU",
        model: "D65PX",
        type: "BULLDOZER",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url: "https://example.com/equipment/bulldozer-1.jpg",
        inspection_date: new Date("2025-07-10T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-12-31T16:00:00.000Z"),
        project_id: "a4b5c6d7-e8f9-4012-def1-234567890123",
        created_by: null,
      },
    }),
  ]);

  // Create vehicles
  console.log("🚗 Creating vehicles...");
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        id: "04cc4f12-bb56-4432-91c1-184448e1704b",
        brand: "KIA",
        model: "DOUBLE CAB",
        type: "PICK-UP TRUCK",
        plate_number: "ATA-3013",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 12,
        inspection_date: new Date("2025-06-08T16:00:00.000Z"),
        expiry_date: new Date("2025-12-08T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/kia-front.jpg",
        back_img_url: "https://example.com/vehicles/kia-back.jpg",
        original_receipt_url: "https://example.com/vehicles/kia-receipt.jpg",
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
        created_by: null,
      },
    }),
    prisma.vehicle.create({
      data: {
        id: "440d9e0b-7b91-401e-803e-78c4701fc8db",
        brand: "TOYOTA",
        model: "INNOVA",
        type: "MULTI-PURPOSE VEHICLE",
        plate_number: "TII-896",
        owner: "DESCO",
        status: status.NON_OPERATIONAL,
        before: 12,
        inspection_date: new Date("2025-06-08T16:00:00.000Z"),
        expiry_date: new Date("2025-12-22T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/innova-front.jpg",
        back_img_url: "https://example.com/vehicles/innova-back.jpg",
        remarks: "Engine issues - needs major overhaul",
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
        created_by: null,
      },
    }),
    prisma.vehicle.create({
      data: {
        id: "6847971a-cd0b-4e45-aa44-6cd726c99ae5",
        brand: "TOYOTA",
        model: "HILUX",
        type: "PICK-UP TRUCK",
        plate_number: "YQ-721A",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 1,
        inspection_date: new Date("2025-06-19T16:00:00.000Z"),
        expiry_date: new Date("2025-12-19T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/hilux-front.jpg",
        pgpc_inspection_image: "https://example.com/vehicles/hilux-pgpc-inspection.jpg",
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        created_by: null,
      },
    }),

    // New Vehicles
    prisma.vehicle.create({
      data: {
        id: "d7e8f9a0-b1c2-4345-1234-567890123456",
        brand: "FORD",
        model: "RANGER",
        type: "PICK-UP TRUCK",
        plate_number: "ABC-1234",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 6,
        inspection_date: new Date("2025-07-01T16:00:00.000Z"),
        expiry_date: new Date("2026-01-01T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/ranger-front.jpg",
        back_img_url: "https://example.com/vehicles/ranger-back.jpg",
        project_id: "f3a4b5c6-d7e8-4901-cdef-123456789012",
        created_by: null,
      },
    }),
    prisma.vehicle.create({
      data: {
        id: "e8f9a0b1-c2d3-4456-2345-678901234567",
        brand: "ISUZU",
        model: "D-MAX",
        type: "PICK-UP TRUCK",
        plate_number: "XYZ-9876",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 3,
        inspection_date: new Date("2025-07-05T16:00:00.000Z"),
        expiry_date: new Date("2026-01-05T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/dmax-front.jpg",
        back_img_url: "https://example.com/vehicles/dmax-back.jpg",
        project_id: "a4b5c6d7-e8f9-4012-def1-234567890123",
        created_by: null,
      },
    }),
    prisma.vehicle.create({
      data: {
        id: "f9a0b1c2-d3e4-4567-3456-789012345678",
        brand: "MITSUBISHI",
        model: "MONTERO SPORT",
        type: "SUV",
        plate_number: "DEF-5678",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 2,
        inspection_date: new Date("2025-07-12T16:00:00.000Z"),
        expiry_date: new Date("2026-01-12T16:00:00.000Z"),
        front_img_url: "https://example.com/vehicles/montero-front.jpg",
        back_img_url: "https://example.com/vehicles/montero-back.jpg",
        project_id: "8c10d946-16a3-4628-af6c-3d6d56209f89",
        created_by: null,
      },
    }),
  ]);

  // Create maintenance reports for equipment
  console.log("🔧 Creating equipment maintenance reports...");
  const equipmentReports = await Promise.all([
    prisma.maintenance_equipment_report.create({
      data: {
        id: "7bdf7f10-061c-462e-8d6e-87d89ea9392b",
        equipment_id: "4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Routine preventive maintenance",
        remarks: "Regular PM schedule - no issues found",
        inspection_details: "All systems operating normally",
        action_taken: "Completed routine maintenance",
        parts_replaced: [],
        priority: report_priority.LOW,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-30T00:00:00.000Z"),
        date_repaired: new Date("2025-07-30T08:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.create({
      data: {
        id: "87dc5fb0-b3d8-469f-8021-3becfda7b5c6",
        equipment_id: "7e6b2374-1520-441a-ab13-6cf628e6929e",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Scheduled PMS (Preventive Maintenance Service)",
        action_taken: "Oil change and filter replacement",
        parts_replaced: ["Engine Oil Filter", "Fuel Filter", "Water Separator"],
        priority: report_priority.HIGH,
        status: report_status.IN_PROGRESS,
        date_reported: new Date("2025-07-04T02:00:11.424Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.create({
      data: {
        id: "8f472b60-8c4b-40da-83e2-245a57a2b572",
        equipment_id: "4bfda437-e6e4-49cf-87b1-66a3a4d77115",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Scheduled PMS (Preventive Maintenance Service)",
        action_taken: "Oil change and filter replacement",
        parts_replaced: ["Engine Oil Filter", "Fuel Filter", "Water Separator"],
        priority: report_priority.HIGH,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-04T01:58:18.735Z"),
        date_repaired: new Date("2025-07-04T16:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.create({
      data: {
        id: "af0a2e4e-70d4-43c9-a6a6-00416f31a8ca",
        equipment_id: "08aacedf-9482-4699-951e-d31275037bac",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Generator failure - burn out",
        inspection_details: "Unit not starting, suspected stator winding damage",
        action_taken: "Unit marked for major repair - awaiting parts",
        parts_replaced: [],
        priority: report_priority.HIGH,
        status: report_status.REPORTED,
        date_reported: new Date("2025-06-23T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.create({
      data: {
        id: "b5a6831b-e867-42fd-b2e4-725504435624",
        equipment_id: "66ea7472-3587-4155-b817-f93122c3491d",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Engine power loss",
        inspection_details: "Fuel sensor replaced, still experiencing low power",
        action_taken: "Waiting for OBD scanner diagnostic",
        parts_replaced: ["Fuel Sensor"],
        priority: report_priority.HIGH,
        status: report_status.IN_PROGRESS,
        date_reported: new Date("2025-07-12T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),

    // Additional equipment reports
    prisma.maintenance_equipment_report.create({
      data: {
        id: "a0b1c2d3-e4f5-4678-4567-890123456789",
        equipment_id: "b5c6d7e8-f9a0-4123-ef12-345678901234",
        location_id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        reported_by: null,
        repaired_by: null,
        issue_description: "Hydraulic leak detected",
        inspection_details: "Small leak from main hydraulic cylinder",
        action_taken: "Sealed leak and topped up hydraulic fluid",
        parts_replaced: ["Hydraulic Seal Kit"],
        priority: report_priority.MEDIUM,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-15T00:00:00.000Z"),
        date_repaired: new Date("2025-07-16T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.create({
      data: {
        id: "b1c2d3e4-f5a6-4789-5678-901234567890",
        equipment_id: "c6d7e8f9-a0b1-4234-f123-456789012345",
        location_id: "b2c3d4e5-f6a7-4901-bcde-f21234567891",
        reported_by: null,
        repaired_by: null,
        issue_description: "Track chain adjustment needed",
        inspection_details: "Track tension below specification",
        action_taken: "Adjusted track tension to specification",
        parts_replaced: [],
        priority: report_priority.LOW,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-18T00:00:00.000Z"),
        date_repaired: new Date("2025-07-18T14:00:00.000Z"),
        attachment_urls: [],
      },
    }),
  ]);

  // Create maintenance reports for vehicles
  console.log("🚗 Creating vehicle maintenance reports...");
  const vehicleReports = await Promise.all([
    prisma.maintenance_vehicle_report.create({
      data: {
        id: "e4f5a6b7-c8d9-4012-8901-234567890123",
        vehicle_id: "440d9e0b-7b91-401e-803e-78c4701fc8db",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Engine overheating and loss of power",
        inspection_details: "Coolant system leak, possible head gasket failure",
        action_taken: "Vehicle taken out of service for major repair",
        parts_replaced: [],
        priority: report_priority.HIGH,
        status: report_status.REPORTED,
        date_reported: new Date("2025-06-20T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_vehicle_report.create({
      data: {
        id: "f5a6b7c8-d9e0-4123-9012-345678901234",
        vehicle_id: "04cc4f12-bb56-4432-91c1-184448e1704b",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Routine oil change and inspection",
        inspection_details: "All systems checked and operating normally",
        action_taken: "Oil and filter changed, tire pressure adjusted",
        parts_replaced: ["Engine Oil", "Oil Filter"],
        priority: report_priority.LOW,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-01T00:00:00.000Z"),
        date_repaired: new Date("2025-07-01T10:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_vehicle_report.create({
      data: {
        id: "a6b7c8d9-e0f1-4234-0123-456789012345",
        vehicle_id: "6847971a-cd0b-4e45-aa44-6cd726c99ae5",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null,
        repaired_by: null,
        issue_description: "Brake pad replacement",
        inspection_details: "Front brake pads worn to minimum thickness",
        action_taken: "Replaced front brake pads and resurfaced rotors",
        parts_replaced: ["Front Brake Pads", "Brake Fluid"],
        priority: report_priority.MEDIUM,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-10T00:00:00.000Z"),
        date_repaired: new Date("2025-07-10T15:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_vehicle_report.create({
      data: {
        id: "c2d3e4f5-a6b7-4890-6789-012345678901",
        vehicle_id: "d7e8f9a0-b1c2-4345-1234-567890123456",
        location_id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        reported_by: null,
        repaired_by: null,
        issue_description: "Air conditioning not cooling properly",
        inspection_details: "Low refrigerant level detected",
        action_taken: "Recharged A/C system and checked for leaks",
        parts_replaced: ["A/C Refrigerant"],
        priority: report_priority.LOW,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-20T00:00:00.000Z"),
        date_repaired: new Date("2025-07-20T11:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_vehicle_report.create({
      data: {
        id: "d3e4f5a6-b7c8-4901-7890-123456789012",
        vehicle_id: "e8f9a0b1-c2d3-4456-2345-678901234567",
        location_id: "b2c3d4e5-f6a7-4901-bcde-f21234567891",
        reported_by: null,
        repaired_by: null,
        issue_description: "Tire rotation and balance",
        inspection_details: "Uneven tire wear pattern observed",
        action_taken: "Rotated tires and performed wheel balancing",
        parts_replaced: [],
        priority: report_priority.LOW,
        status: report_status.COMPLETED,
        date_reported: new Date("2025-07-22T00:00:00.000Z"),
        date_repaired: new Date("2025-07-22T13:00:00.000Z"),
        attachment_urls: [],
      },
    }),
  ]);

  console.log("✅ Database seeding completed successfully!");
  console.log(`📍 Created ${locations.length} locations`);
  console.log(`🏢 Created ${clients.length} clients`);
  console.log(`📋 Created ${projects.length} projects`);
  console.log(`⚙️ Created ${equipment.length} equipment items`);
  console.log(`🚗 Created ${vehicles.length} vehicles`);
  console.log(`🔧 Created ${equipmentReports.length} equipment maintenance reports`);
  console.log(`🚗 Created ${vehicleReports.length} vehicle maintenance reports`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });