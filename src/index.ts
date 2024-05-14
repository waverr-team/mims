import bodyParser from 'body-parser';
import express from 'express';
import env from './env';
import brokerRouter from './routes/brokerRoutes';
import marketDataRouter from './routes/marketDataRoutes';
import pairRouter from './routes/pairRoutes';

const app = express();

app.listen(env.MIMS_PORT, env.MIMS_HOST, () => {
	console.log(`Server running on http://${env.MIMS_HOST}:${env.MIMS_PORT}`);
});

app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.send(env);
});

app.use('/marketData', marketDataRouter);
app.use('/pair', pairRouter);
app.use('/broker', brokerRouter);
