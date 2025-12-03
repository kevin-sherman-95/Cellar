import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

const providers = []

// Add Credentials Provider for email/password login
providers.push(
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email }
      })

      if (!user || !user.password) {
        return null
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

      if (!isPasswordValid) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    }
  })
)

// Add other providers
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  )
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    })
  )
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth account linking with existing email/password accounts
      if (account?.provider === 'google' || account?.provider === 'github') {
        const email = user.email
        if (!email) return false

        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true }
        })

        if (existingUser) {
          // Check if this OAuth account is already linked
          const existingAccount = existingUser.accounts.find(
            acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          )

          if (!existingAccount) {
            // Link the OAuth account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              }
            })

            // Update user profile with OAuth data if not already set
            if (!existingUser.image && user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image }
              })
            }
          }
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      // For OAuth users, fetch the user id from database
      if (account?.provider !== 'credentials' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email }
        })
        if (dbUser) {
          token.id = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
