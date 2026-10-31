
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('================================');
  console.log('Mall Insight Backend');
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Проверка API: http://localhost:${PORT}/api/health`);
  console.log('================================');
});
