import { CosmosClient } from "@azure/cosmos";

// Check environment variables
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

let client: CosmosClient;
let container: any;

export const initDb = async () => {
  if (!endpoint || !key) {
    console.warn("⚠️ No Cosmos DB credentials found. Database features will be disabled.");
    return;
  }

  try {
    client = new CosmosClient({ endpoint, key });
    const database = client.database("EdiPlatformDB");
    container = database.container("Transactions");
    console.log("✅ Connected to Cosmos DB (Transactions)");
  } catch (err) {
    console.error("❌ Failed to connect to Cosmos DB", err);
  }
};

export const getContainer = () => {
  if (!container) throw new Error("Database not initialized");
  return container;
};