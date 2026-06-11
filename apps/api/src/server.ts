import { buildApp } from './app.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`API docs available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
