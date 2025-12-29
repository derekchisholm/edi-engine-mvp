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

export const PoAckSchema = z.object({
  poNumber: z.string(),
  ackStatus: z.enum(['Accepted', 'Rejected', 'AcceptedWithChanges']),
  ackDate: z.string().optional(), // ISO string
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    status: z.enum(['Accepted', 'Rejected', 'Backordered'])
  })).optional()
});
export type PoAckInput = z.infer<typeof PoAckSchema>;

export const AsnSchema = z.object({
  shipmentId: z.string(),
  poNumber: z.string(),
  shipDate: z.string(), // ISO string
  carrier: z.string(),
  trackingNumber: z.string(),
  shipTo: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string()
  }),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number()
  }))
});
export type AsnInput = z.infer<typeof AsnSchema>;

export const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  poNumber: z.string(),
  invoiceDate: z.string(), // ISO string
  terms: z.string().optional(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    unitPrice: z.number()
  })),
  totalAmount: z.number()
});
export type InvoiceInput = z.infer<typeof InvoiceSchema>;

export const RemittanceSchema = z.object({
  paymentNumber: z.string(),
  paymentDate: z.string(),
  totalAmount: z.number(),
  payer: z.string(),
  invoices: z.array(z.object({
    invoiceNumber: z.string(),
    amountPaid: z.number()
  }))
});
export type RemittanceInput = z.infer<typeof RemittanceSchema>;