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
const TransactionSetHeaderSchema = z.object({
  transactionSetIdentifierCode: z.string(),
  transactionSetControlNumber: z.string()
});

const BeginningSegmentForPurchaseOrderSchema = z.object({
  purchaseOrderTypeCode: z.string(),
  purchaseOrderNumber: z.string(),
  releaseNumber: z.string().optional(),
  date: z.string()
});

const CurrencySchema = z.object({
  entityIdentifierCode: z.string(),
  currencyCode: z.string(),
  exchangeRate: z.string().optional(),
  entityIdentifierCode2: z.string().optional(),
  currencyCode2: z.string().optional()
});

const ReferenceIdentificationSchema = z.object({
  referenceIdentificationQualifier: z.string(),
  referenceIdentification: z.string(),
  description: z.string().optional()
});

const AdministrativeCommunicationsContactSchema = z.object({
  contactFunctionCode: z.string(),
  name: z.string().optional(),
  communicationNumberQualifier: z.string().optional(),
  communicationNumber: z.string().optional(),
  communicationNumberQualifier2: z.string().optional(),
  communicationNumber2: z.string().optional(),
  communicationNumberQualifier3: z.string().optional(),
  communicationNumber3: z.string().optional()
});

const TaxReferenceSchema = z.object({
  taxIdentificationNumber: z.string(),
  locationQualifier: z.string().optional(),
  locationIdentifier: z.string().optional()
});

const FobRelatedInstructionsSchema = z.object({
  shipmentMethodOfPayment: z.string(),
  locationQualifier: z.string().optional(),
  description: z.string().optional()
});

const PricingInformationSchema = z.object({
  classOfTradeCode: z.string().optional(),
  priceIdentifierCode: z.string().optional(),
  unitPrice: z.number().optional(),
  quantity: z.number().optional(),
  unitOfMeasurementCode: z.string().optional()
});

const PeriodAmountSchema = z.object({
  amountQualifierCode: z.string().optional(),
  monetaryAmount: z.number().optional(),
  unitOfTimePeriodOrInterval: z.string().optional(),
  dateTimeQualifier: z.string().optional(),
  date: z.string().optional()
});

const SalesRequirementsSchema = z.object({
  salesRequirementCode: z.string().optional()
});

const ServicePromotionAllowanceChargeInformationSchema = z.object({
  allowanceOrChargeIndicator: z.string(),
  servicePromotionAllowanceOrChargeCode: z.string().optional(),
  amount: z.number().optional()
});

const TermsOfSaleDeferredTermsOfSaleSchema = z.object({
  termsTypeCode: z.string().optional(),
  termsBasisDateCode: z.string().optional(),
  termsDiscountPercent: z.number().optional(),
  termsDiscountDueDate: z.string().optional(),
  termsDiscountDaysDue: z.number().optional(),
  termsNetDueDate: z.string().optional(),
  termsNetDays: z.number().optional(),
  termsDiscountAmount: z.number().optional()
});

const DateTimeReferenceSchema = z.object({
  dateTimeQualifier: z.string(),
  date: z.string().optional(),
  time: z.string().optional(),
  timeCode: z.string().optional()
});

const CarrierDetailsSchema = z.object({
  routingSequenceCode: z.string().optional(),
  identificationCodeQualifier: z.string().optional(),
  identificationCode: z.string().optional(),
  transportationMethodTypeCode: z.string().optional(),
  routing: z.string().optional()
});

const BaselineItemDataSchema = z.object({
  assignedIdentification: z.string().optional(),
  productServiceIDQualifier: z.string().optional(),
  productServiceID: z.string().optional(),
  quantityOrdered: z.number(),
  unitOfMeasurementCode: z.string(),
  unitPrice: z.number().optional(),
  basisOfUnitPriceCode: z.string().optional()
});

const P01LoopSchema = z.object({
  baselineItemData: z.array(BaselineItemDataSchema).optional()
});

const N1LoopSchema = z.object({
  partyIdentification: z.array(z.object({
    entityIdentifierCode: z.string(),
    name: z.string().optional(),
    identificationCodeQualifier: z.string().optional(),
    identificationCode: z.string().optional()
  })).optional(),
  partyLocation: z.array(z.object({
    locationQualifier: z.string().optional(),
    locationIdentifier: z.string().optional()
  })).optional(),
  geographicLocation: z.array(z.object({
    cityName: z.string().optional(),
    stateOrProvinceCode: z.string().optional(),
    postalCode: z.string().optional(),
    countryCode: z.string().optional()
  })).optional()
});

export const PurchaseOrderSchema = z.object({
  transactionSetHeader: z.array(TransactionSetHeaderSchema).optional(),
  beginningSegmentForPurchaseOrder: z.array(BeginningSegmentForPurchaseOrderSchema).optional(),
  currency: z.array(CurrencySchema).optional(),
  referenceIdentification: z.array(ReferenceIdentificationSchema).optional(),
  administrativeCommunicationsContact: z.array(AdministrativeCommunicationsContactSchema).optional(),
  taxReference: z.array(TaxReferenceSchema).optional(),
  fobRelatedInstructions: z.array(FobRelatedInstructionsSchema).optional(),
  pricingInformation: z.array(PricingInformationSchema).optional(),
  periodAmount: z.array(PeriodAmountSchema).optional(),
  salesRequirements: z.array(SalesRequirementsSchema).optional(),
  servicePromotionAllowanceChargeInformation: z.array(ServicePromotionAllowanceChargeInformationSchema).optional(),
  termsOfSaleDeferredTermsOfSale: z.array(TermsOfSaleDeferredTermsOfSaleSchema).optional(),
  dateTimeReference: z.array(DateTimeReferenceSchema).optional(),
  carrierDetails: z.array(CarrierDetailsSchema).optional(),
  N1Loop: z.array(N1LoopSchema).optional(),
  P01Loop: z.array(P01LoopSchema).optional()
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
