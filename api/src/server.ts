import 'dotenv/config';
import { createApp } from './app';
import { buildContainer } from './container';

const PORT = process.env.PORT ?? 3001;

const container = buildContainer();
const app = createApp(container);

app.listen(PORT, () => {
  console.log(`IncidentHub API listening on http://localhost:${PORT}`);
});
