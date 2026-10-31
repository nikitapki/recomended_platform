
import express from 'express';
import cors from 'cors';
import { getPrisma } from './lib/prisma.js';

const app = express();

// Разрешаем запросы от React
app.use(cors({
  origin: 'http://localhost:5174'
}));

// Обработка JSON
app.use(express.json());

// Проверка работоспособности Backend
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend работает',
    timestamp: new Date().toISOString()
  });
});

// Проверяет доступность PostgreSQL, а не только работу Express.
app.get('/api/db/health', async (req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'postgresql',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'postgresql',
      message: 'Database connection is unavailable.'
    });
  }
});

export default app;
