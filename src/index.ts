import { Edi940Generator } from './translator';
import { PurchaseOrderSchema } from './types';

// 1. Simulate the "IT Admin" sending a JSON payload
const incomingJson = {
  transactionSetHeader: [
    {
        transactionSetIdentifierCode: "850",
        transactionSetControlNumber: "0001"
    }
  ],
  beginningSegmentForPurchaseOrder: [
    {
        purchaseOrderTypeCode: "NE",
        purchaseOrderNumber: "PO-2025-001",
        date: "20250101"
    }
  ],
  N1Loop: [
    {
        partyIdentification: [
            { entityIdentifierCode: "ST", name: "Acme Corp Logistics", identificationCodeQualifier: "92", identificationCode: "STORE-001" }
        ],
        geographicLocation: [
            { cityName: "Carson City", stateOrProvinceCode: "NV", postalCode: "89701", countryCode: "US" }
        ]
    }
  ],
  P01Loop: [
    {
        baselineItemData: [
            { 
                quantityOrdered: 50, 
                unitOfMeasurementCode: "EA", 
                productServiceID: "WIDGET-X550",
                unitPrice: 12.50
            }
        ]
    },
    {
        baselineItemData: [
            { 
                quantityOrdered: 200, 
                unitOfMeasurementCode: "EA", 
                productServiceID: "CABLE-CAT6",
                unitPrice: 2.99
            }
        ]
    }
  ]
};

try {
  // 2. Validate the input (Zod magic)
  const validatedOrder = PurchaseOrderSchema.parse(incomingJson);
  console.log("✅ JSON Validation Passed");

  // 3. Generate the X12
  const generator = new Edi940Generator();
  const x12Output = generator.generate(validatedOrder, "MYBUSINESS", "THE3PL");

  // 4. Print the result
  console.log("\n--- GENERATED X12 940 FILE ---");
  console.log(x12Output);
  console.log("------------------------------");

} catch (error) {
  console.error("❌ Validation Failed:", error);
}
