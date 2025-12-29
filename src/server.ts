import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Fastify from 'fastify';
import { z } from 'zod';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import { EdiService } from './services/edi.service';
import { initDb, getContainer } from './db';
import cors from '@fastify/cors';

const server = Fastify({
  logger: true
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const ediService = new EdiService();

// --- Schemas for Documentation ---
const TransactionBodySchema = z.object({
  type: z.enum(['850', '940', '997', '855', '856', '810', '820', '846', '214', '180', '860']),
  sender: z.string(),
  receiver: z.string(),
  payload: z.any() // Can be string (EDI) or Object (JSON)
});

const TransactionFilterSchema = z.object({
  type: z.string().optional(),
  direction: z.string().optional(),
  limit: z.string().transform(Number).optional()
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional()
});

const start = async () => {
  try {
    await initDb();
    
    await server.register(cors, { origin: '*' });

    await server.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'EDI Engine API',
          description: 'REST API for EDI processing (X12)',
          version: '1.0.0',
        },
        servers: [{ url: 'http://localhost:3000' }],
      },
      transform: jsonSchemaTransform, // Crucial for Zod schemas
    });

    await server.register(ScalarApiReference, {
      routePrefix: '/documentation',
      configuration: {
        theme: 'solarized',
        spec: {
          content: () => server.swagger(),
        },
      },
    });

    // --- Unified Transaction API ---

    // 1. Process New Transaction
    server.post('/api/v1/transactions', {
      schema: {
        description: 'Process a new EDI transaction (Generate or Parse)',
        tags: ['Transactions'],
        body: TransactionBodySchema,
        response: {
          200: z.union([z.string(), z.any()]).describe('Returns EDI X12 string (for outbound) or JSON object (for inbound)'),
          400: ErrorSchema,
          500: ErrorSchema
        }
      }
    }, async (request, reply) => {
      try {
        const body = request.body; // Typed automatically
        
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
          return reply.status(400).send({
            error: "Validation Failed",
            details: error.issues
          });
        } else if (error instanceof Error) {
            return reply.status(400).send({ error: error.message });
        } else {
          request.log.error(error);
          return reply.status(500).send({ error: "Internal Server Error" });
        }
      }
    });

    // 2. List Transactions (with optional filters)
    server.get('/api/v1/transactions', {
      schema: {
        description: 'List recent transactions with optional filtering',
        tags: ['Transactions'],
        querystring: TransactionFilterSchema,
        response: {
          500: ErrorSchema
        }
      }
    }, async (request, reply) => {
      try {
        const query = request.query;
        const filters = {
          type: query.type,
          direction: query.direction,
          limit: query.limit || 50
        };
        
        const transactions = await ediService.getTransactions(filters);
        return transactions;
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch transactions" });
      }
    });

    // 3. Get Single Transaction by ID
    server.get('/api/v1/transactions/:id', {
      schema: {
        description: 'Retrieve a specific transaction by its ID',
        tags: ['Transactions'],
        params: z.object({ id: z.string() }),
        response: {
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    }, async (request, reply) => {
      try {
        const { id } = request.params;
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

    server.post('/api/v1/orders', {
        schema: {
            description: 'Legacy endpoint to create an order manually',
            tags: ['Orders (Legacy)'],
            body: z.any()
        }
    }, async (request, reply) => {
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

    server.get('/api/v1/orders', {
        schema: {
            description: 'Legacy endpoint to list orders',
            tags: ['Orders (Legacy)'],
        }
    }, async (request, reply) => {
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

    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log("🚀 Server running on http://0.0.0.0:3000");
    console.log("📚 Documentation available at http://0.0.0.0:3000/documentation");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
