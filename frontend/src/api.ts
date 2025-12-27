import axios from 'axios';

// The shape of the data we send (must match your Zod schema)
export interface OrderData {
  poNumber: string;
  shipTo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

export const generateEdi = async (order: OrderData) => {
  // Use Vite's special import.meta.env for environment variables
  // Fallback to localhost if the var is missing
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const API_URL = `${BASE_URL}/api/v1/generate-940`;
  
  // Debug log to ensure it's pointing to Azure in production
  console.log("Calling API at:", API_URL);

  const response = await axios.post(API_URL, order, {
    responseType: 'text' 
  });
  return response.data;
};