import {
  PrismaClient,
  report_priority,
  report_status,
  status,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Note: User seeding disabled - users will be created via Supabase Auth
  console.log(
    "User seeding disabled - users will be created via Supabase Auth"
  );

  // Create locations from CSV data
  await Promise.all([
    prisma.location.upsert({
      where: { id: "abd30557-34ef-45b2-98e9-2906651a1cc2" },
      update: {},
      create: {
        id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        address: "TIWI",
      },
    }),
    prisma.location.upsert({
      where: { id: "c552165c-3edc-43c2-9fdb-bb622dfdb174" },
      update: {},
      create: {
        id: "c552165c-3edc-43c2-9fdb-bb622dfdb174",
        address: "Test Location",
      },
    }),
  ]);

  // Create clients from CSV data
  await Promise.all([
    prisma.client.upsert({
      where: { id: "328a447e-d3fb-4a36-a7a4-537064047444" },
      update: {},
      create: {
        id: "328a447e-d3fb-4a36-a7a4-537064047444",
        name: "APRI",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
      },
    }),
    prisma.client.upsert({
      where: { id: "bb386ce7-1ed8-4571-ab67-ac988845b301" },
      update: {},
      create: {
        id: "bb386ce7-1ed8-4571-ab67-ac988845b301",
        name: "DESCO MAINTENANCE",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
      },
    }),
    prisma.client.upsert({
      where: { id: "c47d9a10-4765-4824-abc4-2e424e4297ba" },
      update: {},
      create: {
        id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
        name: "PGPC",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
      },
    }),
    prisma.client.upsert({
      where: { id: "c81e566d-7681-4d80-9e06-c9ae8c28dce9" },
      update: {},
      create: {
        id: "c81e566d-7681-4d80-9e06-c9ae8c28dce9",
        name: "Test Client",
        location_id: "c552165c-3edc-43c2-9fdb-bb622dfdb174",
      },
    }),
  ]);

  // Create projects from CSV data
  await Promise.all([
    prisma.project.upsert({
      where: { id: "01ede07d-b0d5-4d3f-be2c-88eb809b17c5" },
      update: {},
      create: {
        id: "01ede07d-b0d5-4d3f-be2c-88eb809b17c5",
        name: "PGPC BORING RIG",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "0eefad71-bde7-4b96-9f09-b55497ca9706" },
      update: {},
      create: {
        id: "0eefad71-bde7-4b96-9f09-b55497ca9706",
        name: "PGPC MECHANICAL",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "26f2ea8c-d033-4e19-aa94-046620872e12" },
      update: {},
      create: {
        id: "26f2ea8c-d033-4e19-aa94-046620872e12",
        name: "PGPC DRILLING",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "7aed8ce6-2a9a-4185-8744-49b6837cc576" },
      update: {},
      create: {
        id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
        name: "DESCO TIWI MAINTENANCE",
        client_id: "bb386ce7-1ed8-4571-ab67-ac988845b301",
      },
    }),
    prisma.project.upsert({
      where: { id: "7e57f4bc-4c0e-4da6-9635-e0cf71e25827" },
      update: {},
      create: {
        id: "7e57f4bc-4c0e-4da6-9635-e0cf71e25827",
        name: "APRI MONTHLY RENTAL",
        client_id: "328a447e-d3fb-4a36-a7a4-537064047444",
      },
    }),
    prisma.project.upsert({
      where: { id: "81d4cfa8-2ed3-49c4-bce0-406b27be3aa6" },
      update: {},
      create: {
        id: "81d4cfa8-2ed3-49c4-bce0-406b27be3aa6",
        name: "BINARY PROJECT",
        client_id: "328a447e-d3fb-4a36-a7a4-537064047444",
      },
    }),
    prisma.project.upsert({
      where: { id: "bb345517-1acc-41fc-be57-c0088f9e051e" },
      update: {},
      create: {
        id: "bb345517-1acc-41fc-be57-c0088f9e051e",
        name: "PGPC MONTHLY RENTAL",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "f806b292-2499-4ae8-b3b0-7426106a7b2b" },
      update: {},
      create: {
        id: "f806b292-2499-4ae8-b3b0-7426106a7b2b",
        name: "PGPC CIVIL",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "a551252c-f76b-449b-9bf7-3d530e82db54" },
      update: {},
      create: {
        id: "a551252c-f76b-449b-9bf7-3d530e82db54",
        name: "PGPC WIRELINE",
        client_id: "c47d9a10-4765-4824-abc4-2e424e4297ba",
      },
    }),
    prisma.project.upsert({
      where: { id: "8c10d946-16a3-4628-af6c-3d6d56209f89" },
      update: {},
      create: {
        id: "8c10d946-16a3-4628-af6c-3d6d56209f89",
        name: "Test Project",
        client_id: "c81e566d-7681-4d80-9e06-c9ae8c28dce9",
      },
    }),
  ]);

  // Create equipment from CSV data (sample)
  await Promise.all([
    prisma.equipment.upsert({
      where: { id: "0326d356-3cb7-4570-b3f6-9737629251cd" },
      update: {},
      create: {
        id: "0326d356-3cb7-4570-b3f6-9737629251cd",
        brand: "HELI",
        model: "-",
        type: "FORK LOADER",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/7e57f4bc-4c0e-4da6-9635-e0cf71e25827/0326d356-3cb7-4570-b3f6-9737629251cd/image_1749775508430.jpg",
        inspection_date: new Date("2025-06-11T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-06-12T16:00:00.000Z"),
        equipment_parts: [],
        project_id: "7e57f4bc-4c0e-4da6-9635-e0cf71e25827",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "08aacedf-9482-4699-951e-d31275037bac" },
      update: {},
      create: {
        id: "08aacedf-9482-4699-951e-d31275037bac",
        brand: "KYOTO",
        model: "TL #6",
        type: "TOWER LIGHT",
        status: status.NON_OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/08aacedf-9482-4699-951e-d31275037bac/image_1750838559355.jpg",
        remarks:
          "JUNE 23, 2025 - FOR INSPECTION / CHECKING\n\nOBSERVATION: Generator failure due to burn-out\nPOSSIBLE ROOT CAUSE: Damage to stator windings suspected, likely caused by prolonged overheating, internal short circuit, or excessive load conditions.",
        equipment_parts: [],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "4bfda437-e6e4-49cf-87b1-66a3a4d77115" },
      update: {},
      create: {
        id: "4bfda437-e6e4-49cf-87b1-66a3a4d77115",
        brand: "DEVELON",
        model: "SD300",
        type: "LOADER",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/4bfda437-e6e4-49cf-87b1-66a3a4d77115/image_1750618094630.jpg",
        inspection_date: new Date("2025-07-03T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-07-08T16:00:00.000Z"),
        before: 12,
        pgpc_inspection_image:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/4bfda437-e6e4-49cf-87b1-66a3a4d77115/pgpc_inspection_1751344273587.jpg",
        thirdparty_inspection_image:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/4bfda437-e6e4-49cf-87b1-66a3a4d77115/thirdparty_inspection_1751850317786.jpg",
        equipment_parts: [],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "7e6b2374-1520-441a-ab13-6cf628e6929e" },
      update: {},
      create: {
        id: "7e6b2374-1520-441a-ab13-6cf628e6929e",
        brand: "ZOOMLION",
        model: "ZRT900 90T",
        type: "ROUGH TERRAIN CRANE",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/7e6b2374-1520-441a-ab13-6cf628e6929e/image_1749797446761.jpg",
        inspection_date: new Date("2025-07-03T16:00:00.000Z"),
        before: 12,
        thirdparty_inspection_image:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/7e6b2374-1520-441a-ab13-6cf628e6929e/thirdparty_inspection_1751850202539.jpg",
        equipment_parts: [
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/26f2ea8c-d033-4e19-aa94-046620872e12/7e6b2374-1520-441a-ab13-6cf628e6929e/1_IMG_20250701_143451%20(1)_1751351923977.jpg",
        ],
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "87161b87-1bc9-43b3-b057-9c3672d857a5" },
      update: {},
      create: {
        id: "87161b87-1bc9-43b3-b057-9c3672d857a5",
        brand: "ZOOMLION",
        model: "ZR320L",
        type: "BORING RIG",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/01ede07d-b0d5-4d3f-be2c-88eb809b17c5/87161b87-1bc9-43b3-b057-9c3672d857a5/image_1749776386348.jpg",
        inspection_date: new Date("2025-01-11T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-06-12T01:58:14.336Z"),
        thirdparty_inspection_image:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/01ede07d-b0d5-4d3f-be2c-88eb809b17c5/87161b87-1bc9-43b3-b057-9c3672d857a5/thirdparty_inspection_1749784931629.png",
        equipment_parts: [],
        project_id: "01ede07d-b0d5-4d3f-be2c-88eb809b17c5",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5" },
      update: {},
      create: {
        id: "4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5",
        brand: "AIRMAN",
        model: "PDS390S",
        type: "COMPRESSOR",
        status: status.OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/7aed8ce6-2a9a-4185-8744-49b6837cc576/4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5/image_1751270943394.jpg",
        equipment_parts: [],
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
      },
    }),
    prisma.equipment.upsert({
      where: { id: "66ea7472-3587-4155-b817-f93122c3491d" },
      update: {},
      create: {
        id: "66ea7472-3587-4155-b817-f93122c3491d",
        brand: "FUSO",
        model: "-",
        type: "VACUUM TRUCK",
        status: status.NON_OPERATIONAL,
        owner: "DESCO",
        image_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/bb345517-1acc-41fc-be57-c0088f9e051e/66ea7472-3587-4155-b817-f93122c3491d/image_1750834567387.jpg",
        inspection_date: new Date("2025-06-02T16:00:00.000Z"),
        insurance_expiration_date: new Date("2025-06-02T16:00:00.000Z"),
        plate_number: "CBS 2751",
        original_receipt_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/bb345517-1acc-41fc-be57-c0088f9e051e/66ea7472-3587-4155-b817-f93122c3491d/receipt_1751861468855.jpg",
        equipment_parts: [
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/equipments/bb345517-1acc-41fc-be57-c0088f9e051e/66ea7472-3587-4155-b817-f93122c3491d/1_viber_image_2025-07-01_14-54-17-867_1751352946189.jpg",
        ],
        project_id: "bb345517-1acc-41fc-be57-c0088f9e051e",
      },
    }),
  ]);

  // Create vehicles from CSV data (sample)
  await Promise.all([
    prisma.vehicle.upsert({
      where: { id: "04cc4f12-bb56-4432-91c1-184448e1704b" },
      update: {},
      create: {
        id: "04cc4f12-bb56-4432-91c1-184448e1704b",
        brand: "KIA",
        model: "DOUBLE CAB",
        type: "PICK - UP TRUCK",
        plate_number: "ATA - 3013",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 12,
        inspection_date: new Date("2025-06-08T16:00:00.000Z"),
        expiry_date: new Date("2025-06-08T16:00:00.000Z"),
        front_img_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/7aed8ce6-2a9a-4185-8744-49b6837cc576/04cc4f12-bb56-4432-91c1-184448e1704b/front/1749440189645_IMG_20250609_093522%20(1).jpg",
        back_img_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/7aed8ce6-2a9a-4185-8744-49b6837cc576/04cc4f12-bb56-4432-91c1-184448e1704b/back/1749440301461_IMG_20250609_093423%20(1).jpg",
        original_receipt_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/7aed8ce6-2a9a-4185-8744-49b6837cc576/04cc4f12-bb56-4432-91c1-184448e1704b/original-receipt/1751861889522_ATA%203013.jpg",
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
      },
    }),
    prisma.vehicle.upsert({
      where: { id: "440d9e0b-7b91-401e-803e-78c4701fc8db" },
      update: {},
      create: {
        id: "440d9e0b-7b91-401e-803e-78c4701fc8db",
        brand: "TOYOTA",
        model: "INNOVA",
        type: "Multi-Purpose Vehicle",
        plate_number: "TII - 896",
        owner: "DESCO",
        status: status.NON_OPERATIONAL,
        before: 12,
        inspection_date: new Date("2025-06-08T16:00:00.000Z"),
        expiry_date: new Date("2025-06-22T16:00:00.000Z"),
        front_img_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/7aed8ce6-2a9a-4185-8744-49b6837cc576/440d9e0b-7b91-401e-803e-78c4701fc8db/front/1749440869394_IMG_20250609_093839%20(1).jpg",
        back_img_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/7aed8ce6-2a9a-4185-8744-49b6837cc576/440d9e0b-7b91-401e-803e-78c4701fc8db/back/1749440835395_IMG_20250609_093839%20(1).jpg",
        project_id: "7aed8ce6-2a9a-4185-8744-49b6837cc576",
      },
    }),
    prisma.vehicle.upsert({
      where: { id: "6847971a-cd0b-4e45-aa44-6cd726c99ae5" },
      update: {},
      create: {
        id: "6847971a-cd0b-4e45-aa44-6cd726c99ae5",
        brand: "TOYOTA",
        model: "HILUX",
        type: "PICK - UP",
        plate_number: "YQ - 721A",
        owner: "DESCO",
        status: status.OPERATIONAL,
        before: 1,
        inspection_date: new Date("2025-06-19T16:00:00.000Z"),
        expiry_date: new Date("2025-07-19T16:00:00.000Z"),
        front_img_url:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/26f2ea8c-d033-4e19-aa94-046620872e12/6847971a-cd0b-4e45-aa44-6cd726c99ae5/front/1751344705822_viber_image_2025-07-01_12-18-38-287-Photoroom.jpg",
        pgpc_inspection_image:
          "https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/vehicles/vehicles/26f2ea8c-d033-4e19-aa94-046620872e12/6847971a-cd0b-4e45-aa44-6cd726c99ae5/pgpc-inspection/1751344708266_viber_image_2025-07-01_12-27-03-693.jpg",
        project_id: "26f2ea8c-d033-4e19-aa94-046620872e12",
      },
    }),
  ]);

  // Create maintenance reports from CSV data
  await Promise.all([
    prisma.maintenance_equipment_report.upsert({
      where: { id: "7bdf7f10-061c-462e-8d6e-87d89ea9392b" },
      update: {},
      create: {
        id: "7bdf7f10-061c-462e-8d6e-87d89ea9392b",
        equipment_id: "4ec24e2c-f0f0-4e9c-aa82-84ac3acbe9e5",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null, // Changed from string to UUID reference
        repaired_by: null, // Changed from string to UUID reference  
        issue_description: "-",
        remarks: "-",
        inspection_details: "-",
        action_taken: "-",
        parts_replaced: [],
        priority: report_priority.LOW,
        status: report_status.REPORTED,
        date_reported: new Date("2025-08-30T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.upsert({
      where: { id: "87dc5fb0-b3d8-469f-8021-3becfda7b5c6" },
      update: {},
      create: {
        id: "87dc5fb0-b3d8-469f-8021-3becfda7b5c6",
        equipment_id: "7e6b2374-1520-441a-ab13-6cf628e6929e",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null, // Changed from string to UUID reference
        repaired_by: null, // Changed from string to UUID reference
        issue_description: "FOR PMS",
        action_taken: "CHANGE OIL",
        parts_replaced: ["OIL FILTER", "FUEL FILTER", "WATER SEPERATOR"],
        priority: report_priority.HIGH,
        status: report_status.REPORTED,
        date_reported: new Date("2025-07-04T02:00:11.424Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.upsert({
      where: { id: "8f472b60-8c4b-40da-83e2-245a57a2b572" },
      update: {},
      create: {
        id: "8f472b60-8c4b-40da-83e2-245a57a2b572",
        equipment_id: "4bfda437-e6e4-49cf-87b1-66a3a4d77115",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null, // Changed from string to UUID reference
        repaired_by: null, // Changed from string to UUID reference
        issue_description: "FOR PMS",
        action_taken: "CHANGE OIL",
        parts_replaced: ["OIL FILTER", "FUEL FILTER", "WATER SEPERATOR"],
        priority: report_priority.HIGH,
        status: report_status.REPORTED,
        date_reported: new Date("2025-07-04T01:58:18.735Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.upsert({
      where: { id: "af0a2e4e-70d4-43c9-a6a6-00416f31a8ca" },
      update: {},
      create: {
        id: "af0a2e4e-70d4-43c9-a6a6-00416f31a8ca",
        equipment_id: "08aacedf-9482-4699-951e-d31275037bac",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null, // Changed from string to UUID reference
        repaired_by: null, // Changed from string to UUID reference
        issue_description: "Burn out",
        inspection_details: "Not starting",
        action_taken: "For checking",
        parts_replaced: [],
        priority: report_priority.MEDIUM,
        status: report_status.REPORTED,
        date_reported: new Date("2025-08-01T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
    prisma.maintenance_equipment_report.upsert({
      where: { id: "b5a6831b-e867-42fd-b2e4-725504435624" },
      update: {},
      create: {
        id: "b5a6831b-e867-42fd-b2e4-725504435624",
        equipment_id: "66ea7472-3587-4155-b817-f93122c3491d",
        location_id: "abd30557-34ef-45b2-98e9-2906651a1cc2",
        reported_by: null, // Changed from string to UUID reference
        repaired_by: null, // Changed from string to UUID reference
        issue_description: "LOW POWER",
        inspection_details: "REPLACED FUEL SENSOR",
        action_taken: "Waiting for OBD scanner",
        parts_replaced: ["FUEL SENSOR"],
        priority: report_priority.HIGH,
        status: report_status.REPORTED,
        date_reported: new Date("2025-07-12T00:00:00.000Z"),
        attachment_urls: [],
      },
    }),
  ]);

  console.log("✅ Seed data inserted or updated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
