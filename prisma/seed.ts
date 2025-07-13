import { PrismaClient, Permission } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // const passwordPlain = 'desco'


  const seedUsers = [
    {
      username: 'superadmin',
      fullname: 'Super Administrator',
      permissions: [
        Permission.VIEW,
        Permission.CREATE,
        Permission.UPDATE,
        Permission.DELETE,
      ],
      passwordPlain: 'desco',
    },
    {
      username: 'admin',
      fullname: 'Administrator',
      permissions: [Permission.VIEW, Permission.CREATE, Permission.UPDATE],
      passwordPlain: 'desco',
    },
    {
      username: 'DESCO',
      fullname: 'Client User',
      permissions: [Permission.VIEW],
      passwordPlain: 'EQUIPMENTS',
    },
  ]



  for (const u of seedUsers) {
    const hashedPassword = await bcrypt.hash(u.passwordPlain, 10)
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullname: u.fullname,
        password: hashedPassword,
        phone: null,
        permissions: u.permissions,
      },
      create: {
        username: u.username,
        fullname: u.fullname,
        password: hashedPassword,
        phone: null,
        permissions: u.permissions,
      },
    })
  }

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
