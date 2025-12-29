import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Fastify from 'fastify';
import { z } from 'zod';
import { Edi940Generator } from './translator';
import { Edi997Generator, AckInput } from './generators/997';
import { Edi855Generator } from './generators/855';
import { Edi856Generator } from './generators/856';
import { Edi810Generator } from './generators/810';
import { Edi846Generator } from './generators/846';
import { Edi850Parser } from './parsers/850';
import { Edi820Parser } from './parsers/820';
import { Edi214Parser } from './parsers/214';
import { Edi180Parser } from './parsers/180';
import { Edi860Parser } from './parsers/860';
import { 
  OrderSchema, OrderInput, PoAckSchema, AsnSchema, InvoiceSchema, 
  InventoryAdviceSchema, PoAckInput, AsnInput, InvoiceInput, InventoryAdviceInput 
} from './types';
import { initDb, getContainer } from './db';
import cors from '@fastify/cors';

const server: FastifyInstance = Fastify({
  logger: true // This gives you structured JSON logging out of the box (great for Splunk later)
});

server.post('/api/v1/generate-940', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body;
    const validatedOrder = OrderSchema.parse(body);
    const generator = new Edi940Generator();
    // In a real app, sender/receiver IDs would come from a database based on the API Key
    const ediOutput = generator.generate(validatedOrder, "MYBUSINESS", "THE3PL");

    await logTransaction({
      type: '940',
      direction: 'OUT',
      businessNum: validatedOrder.poNumber,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;

  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Validation Failed",
        details: error.issues
      });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/generate-997', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as AckInput;
    const generator = new Edi997Generator();
    const ediOutput = generator.generate(body, "MYBUSINESS", "PARTNER");

    await logTransaction({
      type: '997',
      direction: 'OUT',
      businessNum: body.receivedControlNumber,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;

  } catch (error) {
    // Graceful Error Handling
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Validation Failed",
        details: error.issues
      });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/parse-850', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as string;

    if (!body.includes('ISA*')) {
      return reply.status(400).send({ error: "Invalid X12 format" });
    }

    const parser = new Edi850Parser();
    const jsonOutput = parser.parse(body);

    await logTransaction({
      type: '850',
      direction: 'IN',
      businessNum: jsonOutput.poNumber,
      payload: jsonOutput
    });

    reply.type('application/json');
    return jsonOutput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Validation Failed",
        details: error.issues
      });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/generate-855', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body;
    const validated = PoAckSchema.parse(body);
    const generator = new Edi855Generator();
    const ediOutput = generator.generate(validated, "MYBUSINESS", "PARTNER");

    await logTransaction({
      type: '855',
      direction: 'OUT',
      businessNum: validated.poNumber,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: "Validation Failed", details: error.issues });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/generate-856', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body;
    const validated = AsnSchema.parse(body);
    const generator = new Edi856Generator();
    const ediOutput = generator.generate(validated, "MYBUSINESS", "PARTNER");

    await logTransaction({
      type: '856',
      direction: 'OUT',
      businessNum: validated.shipmentId,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: "Validation Failed", details: error.issues });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/generate-810', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body;
    const validated = InvoiceSchema.parse(body);
    const generator = new Edi810Generator();
    const ediOutput = generator.generate(validated, "MYBUSINESS", "PARTNER");

    await logTransaction({
      type: '810',
      direction: 'OUT',
      businessNum: validated.invoiceNumber,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: "Validation Failed", details: error.issues });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/parse-820', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as string;
    if (!body.includes('ISA*')) {
      return reply.status(400).send({ error: "Invalid X12 format" });
    }

    const parser = new Edi820Parser();
    const jsonOutput = parser.parse(body);

    await logTransaction({
      type: '820', // Note: This needs to be added to the Transaction type definition if strict
      direction: 'IN',
      businessNum: jsonOutput.paymentNumber,
      payload: jsonOutput
    });

    reply.type('application/json');
    return jsonOutput;
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
});

server.post('/api/v1/generate-846', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body;
    const validated = InventoryAdviceSchema.parse(body);
    const generator = new Edi846Generator();
    const ediOutput = generator.generate(validated, "MYBUSINESS", "PARTNER");

    await logTransaction({
      type: '846',
      direction: 'OUT',
      businessNum: validated.adviceNumber,
      payload: ediOutput
    });

    reply.type('text/plain');
    return ediOutput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: "Validation Failed", details: error.issues });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

server.post('/api/v1/parse-214', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as string;
    if (!body.includes('ISA*')) {
      return reply.status(400).send({ error: "Invalid X12 format" });
    }

    const parser = new Edi214Parser();
    const jsonOutput = parser.parse(body);

    await logTransaction({
      type: '214',
      direction: 'IN',
      businessNum: jsonOutput.shipmentId,
      payload: jsonOutput
    });

    reply.type('application/json');
    return jsonOutput;
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
});

server.post('/api/v1/parse-180', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as string;
    if (!body.includes('ISA*')) {
      return reply.status(400).send({ error: "Invalid X12 format" });
    }

    const parser = new Edi180Parser();
    const jsonOutput = parser.parse(body);

    await logTransaction({
      type: '180',
      direction: 'IN',
      businessNum: jsonOutput.rmaNumber,
      payload: jsonOutput
    });

    reply.type('application/json');
    return jsonOutput;
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
});

server.post('/api/v1/parse-860', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as string;
    if (!body.includes('ISA*')) {
      return reply.status(400).send({ error: "Invalid X12 format" });
    }

    const parser = new Edi860Parser();
    const jsonOutput = parser.parse(body);

    await logTransaction({
      type: '860',
      direction: 'IN',
      businessNum: jsonOutput.changeNumber,
      payload: jsonOutput
    });

    reply.type('application/json');
    return jsonOutput;
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
});

// SAVE ORDER (From 850 Parser)
server.post('/api/v1/orders', async (request, reply) => {
  try {
    const container = getContainer();
    const orderData = request.body as any;
    
    // Add a timestamp if missing
    if (!orderData.createdAt) {
      orderData.createdAt = new Date().toISOString();
    }
    
    // Cosmos requires an 'id'. Use poNumber or generate one.
    if (!orderData.id) {
        orderData.id = orderData.poNumber || `order-${Date.now()}`;
    }

    const { resource } = await container.items.create(orderData);
    return resource;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to save order" });
  }
});

// GET HISTORY
server.get('/api/v1/orders', async (request, reply) => {
  try {
    const container = getContainer();
    
    // SQL Query to get recent orders
    const querySpec = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT 50"
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    return items;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to fetch history" });
  }
});

server.get('/api/v1/transactions', async (request, reply) => {
  try {
    const container = getContainer();
    const { resources } = await container.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT 100")
      .fetchAll();
    return resources;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to fetch transactions" });
  }
});

const logTransaction = async (data: {
  type: '850' | '940' | '997' | '855' | '856' | '810' | '820' | '846' | '214' | '180' | '860';
  direction: 'IN' | 'OUT';
  businessNum: string;
  payload: any;
}) => {
  try {
    const container = getContainer();
    const record = {
      ...data,
      id: `${data.type}-${Date.now()}`, // Unique ID
      stream: 'Test',                   // Default to Test for this MVP
      validation: 'Valid',              // Assume valid if we processed it
      ackStatus: 'Not Acknowledged',    // Default state
      partner: 'Unknown',               // Would extract from ISA segment in real app
      createdAt: new Date().toISOString()
    };
    await container.items.create(record);
    console.log(`📝 Saved ${data.type} transaction: ${data.businessNum}`);
  } catch (err) {
    console.error("Failed to log transaction", err);
  }
};

// Start the Server
const start = async () => {
  try {
    await initDb();

    await server.register(cors, { origin: '*' });
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
