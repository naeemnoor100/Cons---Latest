// Database Configuration (Equivalent to Config.php)
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_CONFIG = {
  type: 'sqlite', // In a real MySQL environment, this would be 'mysql'
  database: path.join(__dirname, 'buildtrack.sqlite'),
  // MySQL specific details (for user reference)
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'buildtrack_pro'
  }
};
