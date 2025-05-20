import { PrismaClient, Permission } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordPlain = 'desco'
  const hashedPassword = await bcrypt.hash(passwordPlain, 10)

  const seedUsers = [
    {
      username:    'superadmin',
      fullname:    'Super Administrator',
      permissions: [ Permission.VIEW, Permission.CREATE, Permission.UPDATE, Permission.DELETE ],
    },
    {
      username:    'admin',
      fullname:    'Administrator',
      permissions: [ Permission.VIEW, Permission.CREATE, Permission.UPDATE, Permission.UPDATE ],
    },
    {
      username:    'client',
      fullname:    'Client User',
      permissions: [ Permission.VIEW ],
    },
  ]

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where:  { username: u.username },
      update: {
        fullname:    u.fullname,
        password:    hashedPassword,
        phone:       null,
        permissions: u.permissions,
      },
      create: {
        username:    u.username,
        fullname:    u.fullname,
        password:    hashedPassword,
        phone:       null,
        permissions: u.permissions,
      },
    })
  }

  console.log('✅ Seed data inserted or updated.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
