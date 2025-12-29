import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Updated to match backend PurchaseOrderSchema
export interface OrderData {
  poNumber: string;
  shipTo: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  items: Array<{
    sku: string;
    quantity: number;
    uom?: string;
  }>;
}

export interface AckData {
  receivedControlNumber: string;
  accepted: boolean;
}

export interface Transaction {
  id: string;
  type: '850' | '940' | '997' | '855' | '856' | '810' | '820' | '846' | '214' | '180' | '860';
  direction: 'IN' | 'OUT';
  validation: 'Valid' | 'Invalid';
  stream: 'Test' | 'Live';
  businessNum: string;
  partner: string;
  ackStatus: 'Accepted' | 'Rejected' | 'Not Acknowledged';
  createdAt: string;
}

// Unified API Call
const processTransaction = async (type: string, payload: any, sender: string = 'MYBUSINESS', receiver: string = 'PARTNER') => {
  const response = await axios.post(`${BASE_URL}/api/v1/transactions`, {
    type,
    sender,
    receiver,
    payload
  });
  return response.data; // Returns X12 string or JSON
};

export const generateEdi940 = async (order: OrderData) => {
  return await processTransaction('940', order);
};

export const generateEdi997 = async (ack: AckData) => {
  return await processTransaction('997', ack);
};

export const parseEdi850 = async (x12Raw: string) => {
  // Parsing is "INBOUND 850"
  // The backend infers direction=IN if payload starts with ISA, 
  // but explicitly we call it '850' transaction.
  // Note: Backend expects { type: '850', payload: x12String }
  return await processTransaction('850', x12Raw);
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
