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

export const InventoryAdviceSchema = z.object({
  adviceNumber: z.string(),
  date: z.string(), // ISO string
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    location: z.string().optional(),
    status: z.string().optional() // e.g., 'Available', 'Hold'
  }))
});
export type InventoryAdviceInput = z.infer<typeof InventoryAdviceSchema>;

export const CarrierStatusSchema = z.object({
  shipmentId: z.string(),
  carrierCode: z.string(),
  statusDate: z.string(),
  statusTime: z.string().optional(),
  statusDetails: z.array(z.object({
    code: z.string(), // e.g., 'X1' for Arrived
    city: z.string(),
    state: z.string(),
    description: z.string().optional()
  }))
});
export type CarrierStatusOutput = z.infer<typeof CarrierStatusSchema>;

export const ReturnAuthorizationSchema = z.object({
  rmaNumber: z.string(),
  orderNumber: z.string().optional(),
  customer: z.object({
    name: z.string().optional(),
    id: z.string().optional()
  }),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    reasonCode: z.string().optional()
  }))
});
export type ReturnAuthorizationOutput = z.infer<typeof ReturnAuthorizationSchema>;

export const PurchaseOrderChangeSchema = z.object({
  changeNumber: z.string(),
  poNumber: z.string(),
  changeDate: z.string(),
  changeType: z.string().optional(), // e.g., '01' (Cancellation), '04' (Change)
  items: z.array(z.object({
    lineId: z.string(),
    changeCode: z.string(), // e.g., 'AI' (Add), 'DI' (Delete), 'CA' (Change)
    quantity: z.number().optional(),
    price: z.number().optional(),
    sku: z.string().optional()
  }))
});
export type PurchaseOrderChangeOutput = z.infer<typeof PurchaseOrderChangeSchema>;