import { Edi940Generator } from '../translator';
import { Edi997Generator } from '../generators/997';
import { Edi855Generator } from '../generators/855';
import { Edi856Generator } from '../generators/856';
import { Edi810Generator } from '../generators/810';
import { Edi846Generator } from '../generators/846';
import { Edi850Generator } from '../generators/850';
import { Edi860Generator } from '../generators/860';
import { Edi850Parser } from '../parsers/850';
import { Edi820Parser } from '../parsers/820';
import { Edi214Parser } from '../parsers/214';
import { Edi180Parser } from '../parsers/180';
import { Edi860Parser } from '../parsers/860';
import {
  PurchaseOrderSchema, PurchaseOrderPayloadSchema, PurchaseOrderChangeSchema, PoAckSchema, AsnSchema, InvoiceSchema,
  InventoryAdviceSchema
} from '../types';
import { getContainer } from '../db';
import { z } from 'zod';

type TransactionType = '850' | '940' | '997' | '855' | '856' | '810' | '820' | '846' | '214' | '180' | '860';
type Direction = 'IN' | 'OUT';

interface TransactionRequest {
  type: TransactionType;
  sender: string;
  receiver: string;
  payload: any;
}

export class EdiService {
  
  async processTransaction(req: TransactionRequest) {
    const { type, sender, receiver, payload } = req;
    
    // Infer Direction
    let direction: Direction = 'OUT';
    
    // Simple heuristic: If payload is string and looks like X12, it's INBOUND (Parse)
    if (typeof payload === 'string' && payload.trim().startsWith('ISA')) {
      direction = 'IN';
    } else {
      // Otherwise assume it's a JSON object for OUTBOUND (Generate)
      direction = 'OUT';
    }

    let result: any;
    let businessNum = 'UNKNOWN';

    // OUTBOUND (Generate EDI)
    if (direction === 'OUT') {
      switch (type) {
        case '850': {
          const valid = PurchaseOrderPayloadSchema.parse(payload);
          businessNum = valid.transactionSets.map(t => t.poNumber).join(', ');
          if (businessNum.length > 100) businessNum = businessNum.substring(0, 97) + '...';
          result = new Edi850Generator().generate(valid, sender, receiver);
          break;
        }
        case '860': {
          const valid = PurchaseOrderChangeSchema.parse(payload);
          businessNum = valid.changeOrderNumber || valid.poNumber;
          result = new Edi860Generator().generate(valid, sender, receiver);
          break;
        }
        case '940': {
          const valid = PurchaseOrderSchema.parse(payload);
          businessNum = valid.poNumber;
          result = new Edi940Generator().generate(valid, sender, receiver);
          break;
        }
        case '997': {
          businessNum = payload.receivedControlNumber || 'UNKNOWN';
          result = new Edi997Generator().generate(payload, sender, receiver);
          break;
        }
        case '855': {
          const valid = PoAckSchema.parse(payload);
          businessNum = valid.poNumber;
          result = new Edi855Generator().generate(valid, sender, receiver);
          break;
        }
        case '856': {
          const valid = AsnSchema.parse(payload);
          businessNum = valid.shipmentId;
          result = new Edi856Generator().generate(valid, sender, receiver);
          break;
        }
        case '810': {
          const valid = InvoiceSchema.parse(payload);
          businessNum = valid.invoiceNumber;
          result = new Edi810Generator().generate(valid, sender, receiver);
          break;
        }
        case '846': {
          const valid = InventoryAdviceSchema.parse(payload);
          businessNum = valid.adviceNumber;
          result = new Edi846Generator().generate(valid, sender, receiver);
          break;
        }
        default:
          throw new Error(`Unsupported OUT transaction type: ${type}`);
      }
    } 
    // INBOUND (Parse EDI)
    else {
      const ediContent = payload as string;
      switch (type) {
        case '850': {
          const parsed = new Edi850Parser().parse(ediContent);
          businessNum = parsed.poNumber;
          result = parsed;
          break;
        }
        case '820': {
          const parsed = new Edi820Parser().parse(ediContent);
          businessNum = parsed.paymentNumber;
          result = parsed;
          break;
        }
        case '214': {
          const parsed = new Edi214Parser().parse(ediContent);
          businessNum = parsed.shipmentId;
          result = parsed;
          break;
        }
        case '180': {
          const parsed = new Edi180Parser().parse(ediContent);
          businessNum = parsed.rmaNumber;
          result = parsed;
          break;
        }
        case '860': {
          const parsed = new Edi860Parser().parse(ediContent);
          businessNum = parsed.changeOrderNumber || parsed.poNumber;
          result = parsed;
          break;
        }
        default:
          throw new Error(`Unsupported IN transaction type: ${type}`);
      }
    }

    // Log to DB
    await this.logTransaction({
      type,
      direction,
      sender,
      receiver,
      businessNum,
      payload: result
    });

    return result;
  }

  private async logTransaction(data: {
    type: TransactionType;
    direction: Direction;
    sender: string;
    receiver: string;
    businessNum: string;
    payload: any;
  }) {
    try {
      const container = getContainer();
      
      const partner = data.direction === 'IN' ? data.sender : data.receiver;

      const record = {
        ...data,
        id: `${data.type}-${Date.now()}`,
        stream: 'Test', 
        validation: 'Valid',
        ackStatus: 'Not Acknowledged',
        partner: partner,
        createdAt: new Date().toISOString()
      };
      await container.items.create(record);
      console.log(`📝 Saved ${data.type} (${data.direction}) transaction: ${data.businessNum}`);
    } catch (err) {
      console.error("Failed to log transaction", err);
    }
  }

  async getTransactions(filters: { type?: string; direction?: string; limit?: number }) {
    try {
        const container = getContainer();
        let query = "SELECT * FROM c WHERE 1=1";
        const parameters = [];

        if (filters.type) {
            query += " AND c.type = @type";
            parameters.push({ name: "@type", value: filters.type });
        }
        if (filters.direction) {
            query += " AND c.direction = @direction";
            parameters.push({ name: "@direction", value: filters.direction });
        }

        query += " ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit";
        parameters.push({ name: "@limit", value: filters.limit || 50 });

        const { resources } = await container.items.query({
            query,
            parameters
        }).fetchAll();
        return resources;
    } catch (err) {
        console.error("Failed to fetch transactions", err);
        throw err;
    }
  }

  async getTransactionById(id: string) {
      try {
          const container = getContainer();
          const querySpec = {
              query: "SELECT * FROM c WHERE c.id = @id",
              parameters: [{ name: "@id", value: id }]
          };
          const { resources } = await container.items.query(querySpec).fetchAll();
          return resources[0] || null;
      } catch (err) {
          console.error("Failed to fetch transaction by ID", err);
          throw err;
      }
  }
}
