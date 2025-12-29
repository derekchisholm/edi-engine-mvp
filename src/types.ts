import { z } from 'zod';

// Shared Sub-Schemas

export const AddressSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(), // Location ID (e.g., Store Number, DC Number)
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip: z.string().optional(),
  country: z.string().length(2).optional()
});

export const LineItemSchema = z.object({
  lineNumber: z.number().int().positive().optional(), // Assigned if missing
  sku: z.string().min(1), // Vendor Part Number (VN)
  upc: z.string().optional(), // UPC (UP)
  buyerPartNumber: z.string().optional(), // Buyer Part Number (BP)
  description: z.string().optional(),
  quantity: z.number().positive(),
  uom: z.string().length(2).default('EA'), // Unit of Measure (e.g., EA, CS)
  price: z.number().positive().optional()
});

// --------------------------------------------------------------------------
// Standard Payload Wrapper
// --------------------------------------------------------------------------
export const createStandardPayload = <T extends z.ZodTypeAny>(schema: T) => z.object({
  transactionSets: z.array(schema)
});

// --------------------------------------------------------------------------
// 850 Purchase Order (Inbound/Outbound)
// --------------------------------------------------------------------------
export const PurchaseOrderSchema = z.object({
  poNumber: z.string().min(1),
  poDate: z.string().optional(), // ISO String (YYYY-MM-DD). Defaults to today.
  type: z.string().default('NE'), // NE = New Order, SA = Stand-alone
  
  // Parties
  buyer: AddressSchema.optional(), // Bill To (BT)
  shipTo: AddressSchema, // Ship To (ST)
  vendor: AddressSchema.optional(), // Vendor (VN) / Selling Party (SE)

  // Details
  currency: z.string().length(3).default('USD'),
  paymentTerms: z.string().optional(),
  notes: z.array(z.string()).optional(),

  items: z.array(LineItemSchema).min(1)
});

export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;
export const PurchaseOrderPayloadSchema = createStandardPayload(PurchaseOrderSchema);
export type PurchaseOrderPayload = z.infer<typeof PurchaseOrderPayloadSchema>;

// --------------------------------------------------------------------------
// 855 PO Acknowledgement
// --------------------------------------------------------------------------
export const PoAckSchema = z.object({
  poNumber: z.string(),
  ackStatus: z.enum(['Accepted', 'Rejected', 'AcceptedWithChanges']),
  ackDate: z.string().optional(), 
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    status: z.enum(['Accepted', 'Rejected', 'Backordered', 'ItemAccepted', 'ItemRejected']) // Enhanced enum
  })).optional()
});
export type PoAckInput = z.infer<typeof PoAckSchema>;

// --------------------------------------------------------------------------
// 856 Advance Ship Notice (ASN)
// --------------------------------------------------------------------------
export const AsnSchema = z.object({
  shipmentId: z.string(),
  poNumber: z.string(),
  shipDate: z.string(),
  carrier: z.string(),
  trackingNumber: z.string(),
  shipTo: AddressSchema,
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    uom: z.string().default('EA')
  }))
});
export type AsnInput = z.infer<typeof AsnSchema>;

// --------------------------------------------------------------------------
// 810 Invoice
// --------------------------------------------------------------------------
export const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  poNumber: z.string(),
  invoiceDate: z.string(),
  terms: z.string().optional(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    uom: z.string().default('EA')
  })),
  totalAmount: z.number()
});
export type InvoiceInput = z.infer<typeof InvoiceSchema>;

// --------------------------------------------------------------------------
// 860 Purchase Order Change Request
// --------------------------------------------------------------------------
export const PurchaseOrderChangeSchema = z.object({
  changeOrderNumber: z.string().optional(), // Often required if different from PO
  poNumber: z.string(),
  changeDate: z.string().optional(),
  changeType: z.enum(['01', '04']).default('04'), // 01=Cancel, 04=Change
  
  shipTo: AddressSchema.optional(), // If changing dest
  
  items: z.array(z.object({
    lineNumber: z.number().optional(), // Reference line number from original PO
    sku: z.string().min(1),
    changeCode: z.enum(['AI', 'DI', 'CA', 'QD']), // AI=Add, DI=Delete, CA=Change, QD=Qty Decrease
    quantity: z.number().optional(),
    price: z.number().optional()
  }))
});
export type PurchaseOrderChangeInput = z.infer<typeof PurchaseOrderChangeSchema>;
export const PurchaseOrderChangePayloadSchema = createStandardPayload(PurchaseOrderChangeSchema);
export type PurchaseOrderChangePayload = z.infer<typeof PurchaseOrderChangePayloadSchema>;

// --------------------------------------------------------------------------
// Other Supporting Transactions
// --------------------------------------------------------------------------

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
  date: z.string(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    location: z.string().optional(),
    status: z.string().optional()
  }))
});
export type InventoryAdviceInput = z.infer<typeof InventoryAdviceSchema>;

export const CarrierStatusSchema = z.object({
  shipmentId: z.string(),
  carrierCode: z.string(),
  statusDate: z.string(),
  statusTime: z.string().optional(),
  statusDetails: z.array(z.object({
    code: z.string(),
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
