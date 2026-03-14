import 'dotenv/config'
import { PrismaClient } from './generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined")
}

const adapter = new PrismaNeon({ connectionString })

export const prisma = new PrismaClient({ adapter })