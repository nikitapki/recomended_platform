
import express from 'express';
import cors from 'cors';

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

export default app;
