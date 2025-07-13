# B2B-backend

pnpm prisma generate
npx prisma db seed


- initialization of the overall application, simple installation and setup for frontend components
- setup ORM and Supabase
  - install prisma (`npm install @prisma/client`)
  - setup prisma (env setup)
  - run migrations (`npx prisma db push`)
  - run dev migration (`npx prisma migrate dev`)
  - see prisma db (`npx prisma studio`)
  - generate (`pnpm prisma generate`)
- auth setup (todo)
- Reset DB `pnpm prisma db push --force-reset` and `pnpm prisma db seed`







PROCESS:

user can create location details folder
under location details user can create clients details folder
under clients details folder user can create projects details folder
under project details folder user can create equipments and vehicle


users:
superadmin   permission: ALL
admin        permission: ALL
client       permission: view

