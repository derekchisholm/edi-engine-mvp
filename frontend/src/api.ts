import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export interface Transaction {
  id: string;
  type: '850' | '940' | '997';
  direction: 'IN' | 'OUT';
  validation: 'Valid' | 'Invalid';
  stream: 'Test' | 'Live';
  businessNum: string;
  partner: string;
  ackStatus: 'Accepted' | 'Rejected' | 'Not Acknowledged';
  createdAt: string;
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

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/transactions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};