import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Edi940Generator } from './translator';
import { Edi997Generator, AckInput } from './generators/997';
import { Edi850Parser } from './parsers/850';
import { OrderSchema, OrderInput } from './types';
import cors from '@fastify/cors';

const server: FastifyInstance = Fastify({
  logger: true // This gives you structured JSON logging out of the box (great for Splunk later)
});

server.register(cors, { origin: '*' });

server.post('/api/v1/generate-940', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // 1. Validate the Header (API Key placeholder)
    // In prod, you'd check request.headers['x-api-key'] here

    // 2. Validate the Body
    const body = request.body;
    
    // Zod parsing - throws error if invalid
    const validatedOrder = OrderSchema.parse(body);

    // 3. Generate X12
    const generator = new Edi940Generator();
    // In a real app, sender/receiver IDs would come from a database based on the API Key
    const ediOutput = generator.generate(validatedOrder, "MYBUSINESS", "THE3PL");

    // 4. Return the result
    // We set content-type to text/plain so the browser/client treats it as a file
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

server.post('/api/v1/generate-997', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as AckInput;
    
    const generator = new Edi997Generator();
    
    const ediOutput = generator.generate(body, "MYBUSINESS", "PARTNER");

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

// Start the Server
const start = async () => {
  try {
    // Listen on 0.0.0.0 to work inside Docker/Azure
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();