import app from './src/app.js';
import config from './src/config/config.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

app.listen(3001, () => {
  console.log(`Server is running on port ${3001}`);
});