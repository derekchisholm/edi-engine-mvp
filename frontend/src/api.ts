import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export interface AckData {
  receivedControlNumber: string;
  accepted: boolean;
}

export const generateEdi940 = async (order: OrderData) => {
  const response = await axios.post(`${BASE_URL}/api/v1/generate-940`, order, {
    responseType: 'text'
  });
  return response.data;
};

export const generateEdi997 = async (ack: AckData) => {
  const response = await axios.post(`${BASE_URL}/api/v1/generate-997`, ack, {
    responseType: 'text'
  });
  return response.data;
};

export const parseEdi850 = async (x12Raw: string) => {
  // We send text/plain, get back JSON
  const response = await axios.post(`${BASE_URL}/api/v1/parse-850`, x12Raw, {
    headers: { 'Content-Type': 'text/plain' }
  });
  return response.data;
};
