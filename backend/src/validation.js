
// backend/src/validation.js
import { z } from 'zod'

export const createReportSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(3).max(32),
  location: z.string().min(2).max(128),
  type_id: z.number().int().positive(),
  description: z.string().min(5)
})

export const updateStatusSchema = z.object({
  new_status: z.enum(['NOT_OPENED','UNDER_PROCESS','RESOLVED']),
  version: z.number().int().positive()
})
