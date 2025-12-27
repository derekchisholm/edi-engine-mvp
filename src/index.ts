import { Edi940Generator } from './translator';
import { OrderSchema } from './types';

// 1. Simulate the "IT Admin" sending a JSON payload
const incomingJson = {
  poNumber: "PO-2025-001",
  shipTo: {
    name: "Acme Corp Logistics",
    address: "400 Enterprise Way",
    city: "Carson City",
    state: "NV",
    zip: "89701"
  },
  items: [
    { sku: "WIDGET-X550", quantity: 50 },
    { sku: "CABLE-CAT6", quantity: 200 }
  ]
};

try {
  // 2. Validate the input (Zod magic)
  const validatedOrder = OrderSchema.parse(incomingJson);
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