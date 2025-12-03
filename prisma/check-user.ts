import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for Kevin Sherman account...\n')

  // Search for user by name (SQLite is case-insensitive by default)
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'Kevin',
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      password: true, // This will show if password exists (but not the actual hash)
      createdAt: true,
    },
  })

  // Also search for "Sherman" in case the name is stored differently
  const shermanUsers = await prisma.user.findMany({
    where: {
      name: {
        contains: 'Sherman',
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      createdAt: true,
    },
  })

  // Combine and deduplicate results
  const allUsers = [...users, ...shermanUsers]
  const uniqueUsers = Array.from(
    new Map(allUsers.map((user) => [user.id, user])).values()
  )

  // Always list all users for reference
  const allUsersList = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
    },
  })
  
  if (uniqueUsers.length === 0) {
    console.log('❌ No user found with name containing "Kevin" or "Sherman"')
    
    if (allUsersList.length > 0) {
      console.log(`\n📋 Found ${allUsersList.length} total user(s) in database:`)
      allUsersList.forEach((user) => {
        console.log(`  - ${user.name || 'No name'} (${user.email}) - Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`)
      })
    } else {
      console.log('\n📋 No users found in database.')
    }
  } else {
    console.log(`✅ Found ${uniqueUsers.length} user(s):\n`)
    uniqueUsers.forEach((user) => {
      console.log(`Name: ${user.name}`)
      console.log(`Email: ${user.email}`)
      console.log(`ID: ${user.id}`)
      console.log(`Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`)
      if (user.password) {
        console.log(`Password Hash: ${user.password.substring(0, 30)}... (truncated for security)`)
      }
      console.log(`Created: ${user.createdAt}`)
      console.log('---\n')
    })
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




