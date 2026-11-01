
import 'dotenv/config';
import app from './app.js';
import { disconnectPrisma } from './lib/prisma.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('================================');
  console.log('Mall Insight Backend');
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Проверка API: http://localhost:${PORT}/api/health`);
  console.log('================================');
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing backend connections...`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
