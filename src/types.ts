import { z } from 'zod';

// This is the JSON structure your future customers will send you
export const OrderSchema = z.object({
  poNumber: z.string().min(1),
  shipTo: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string()
  }),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number().int().positive()
  }))
});

export type OrderInput = z.infer<typeof OrderSchema>;