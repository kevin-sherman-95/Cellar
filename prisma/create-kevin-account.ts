import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating Kevin Sherman account...\n')

  const email = 'shermankevin13@yahoo.com'
  const name = 'Kevin Sherman'
  const password = 'admin'

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('⚠️  User with this email already exists:')
    console.log(`   Name: ${existingUser.name}`)
    console.log(`   Email: ${existingUser.email}`)
    console.log(`   Has Password: ${existingUser.password ? 'YES ✅' : 'NO ❌'}`)
    console.log(`   ID: ${existingUser.id}`)
    
    // Check if password needs to be set/updated
    if (!existingUser.password) {
      console.log('\n📝 Setting password for existing account...')
      const hashedPassword = await bcrypt.hash(password, 12)
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      })
      console.log('✅ Password set successfully!')
      return
    } else {
      console.log('\n⚠️  Account already has a password. Skipping creation.')
      return
    }
  }

  // Hash password (note: API validation requires 6+ chars, but we'll allow shorter for direct DB operations)
  console.log('🔒 Hashing password...')
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create user
  console.log('👤 Creating user account...')
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  })

  console.log('\n✅ Account created successfully!')
  console.log(`   Name: ${user.name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`)
  console.log(`   Created: ${user.createdAt}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })








