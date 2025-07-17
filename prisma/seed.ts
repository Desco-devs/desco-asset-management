import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const seedUsers = [
    {
      username: 'superadmin',
      fullname: 'Super Administrator',
      role: Role.SUPERADMIN,
      passwordPlain: 'desco',
    },
    {
      username: 'admin',
      fullname: 'Administrator',
      role: Role.ADMIN,
      passwordPlain: 'desco',
    },
    {
      username: 'DESCO',
      fullname: 'Client User',
      role: Role.VIEWER,
      passwordPlain: 'EQUIPMENTS',
    },
    {
      username: 'DESCOINC_VIEWER',
      fullname: 'DESCOINC Viewer Account',
      role: Role.VIEWER,
      passwordPlain: 'ilovedesco1974',
    },
    {
      username: 'DESCOINC_ADMIN',
      fullname: 'DESCOINC Admin Account',
      role: Role.ADMIN,
      passwordPlain: 'maintenance',
    },
  ]

  // Note: User seeding disabled - users will be created via Supabase Auth
  console.log('User seeding disabled - users will be created via Supabase Auth')

  console.log('✅ Seed data inserted or updated.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
