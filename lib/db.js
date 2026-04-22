import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Required for Neon in Node.js
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined')
}

const globalForPrisma = globalThis

let prisma

if (!globalForPrisma.prisma) {
  const adapter = new PrismaNeon({
    connectionString,
  })

  globalForPrisma.prisma = new PrismaClient({ adapter })
}

prisma = globalForPrisma.prisma

export { prisma }
export default prisma