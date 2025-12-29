import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Fastify from 'fastify';
import { z } from 'zod';
import { EdiService } from './services/edi.service';
import { initDb, getContainer } from './db';
import cors from '@fastify/cors';

const server: FastifyInstance = Fastify({
  logger: true
});

const ediService = new EdiService();

// --- Unified Transaction API ---

// 1. Process New Transaction
server.post('/api/v1/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as any;
    
    // Buyer-Centric API: Inputs are Type, Sender, Receiver, Payload
    if (!body.type || !body.sender || !body.receiver || !body.payload) {
      return reply.status(400).send({ 
        error: "Invalid Request", 
        message: "Must provide 'type', 'sender', 'receiver', and 'payload'." 
      });
    }

    const result = await ediService.processTransaction({
      type: body.type,
      sender: body.sender,
      receiver: body.receiver,
      payload: body.payload
    });

    // Dynamic Content-Type based on result
    if (typeof result === 'string') {
      reply.type('text/plain');
      return result;
    } else {
      reply.type('application/json');
      return result;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Validation Failed",
        details: error.issues
      });
    } else if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
    } else {
      request.log.error(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
});

// 2. List Transactions (with optional filters)
server.get('/api/v1/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as any;
    const filters = {
      type: query.type,
      direction: query.direction,
      limit: query.limit ? parseInt(query.limit) : 50
    };
    
    const transactions = await ediService.getTransactions(filters);
    return transactions;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to fetch transactions" });
  }
});

// 3. Get Single Transaction by ID
server.get('/api/v1/transactions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const transaction = await ediService.getTransactionById(id);
    
    if (!transaction) {
      return reply.status(404).send({ error: "Transaction not found" });
    }
    return transaction;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to fetch transaction" });
  }
});

// --- Legacy / Specific Order Endpoints ---

server.post('/api/v1/orders', async (request, reply) => {
  try {
    const container = getContainer();
    const orderData = request.body as any;
    
    if (!orderData.createdAt) {
      orderData.createdAt = new Date().toISOString();
    }
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

server.get('/api/v1/orders', async (request, reply) => {
  try {
    const container = getContainer();
    const querySpec = {
      query: "SELECT * FROM c WHERE c.type = 'Order' OR (NOT IS_DEFINED(c.type) AND IS_DEFINED(c.poNumber)) ORDER BY c.createdAt DESC OFFSET 0 LIMIT 50"
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    return items;
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to fetch history" });
  }
});

const start = async () => {
  try {
    await initDb();
    await server.register(cors, { origin: '*' });
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log("🚀 Server running on http://0.0.0.0:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
