import { readFileSync, existsSync } from 'node:fs';
import { type Broker, PrismaClient, Pair } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const prisma = new PrismaClient();

async function main() {
	await prisma.broker.deleteMany({});

	await prisma.broker.createMany({
		data: [
			{
				name: 'COINBASE',
			},
			{
				name: 'BINANCE',
			},
		],
	});

	const coinbase = (await prisma.broker.findFirst({
		where: {
			name: 'COINBASE',
		},
	})) as Broker;

	const binance = (await prisma.broker.findFirst({
		where: {
			name: 'BINANCE',
		},
	})) as Broker;

	// Load crypto_data.csv

	const filePath = './prisma/crypto_data.csv';

	if (!existsSync(filePath)) {
		throw new Error('Seed file not found');
	}
	const csvFile = readFileSync(filePath, 'utf-8');

	const cryptoData = parse(csvFile, {
		columns: true,
		skip_empty_lines: true,
	}) as {
		open: string;
		high: string;
		low: string;
		close: string;
		volume: string;
		timestamp: string;
		broker: string;
		base: string;
		quote: string;
	}[];

	const symbolList = Array.from(
		new Set(
			cryptoData.map((crypto) =>
				[crypto.base, crypto.quote, crypto.broker].join('/'),
			),
		),
	).map((symbol) => ({
		base: symbol.split('/')[0],
		quote: symbol.split('/')[1],
		broker: symbol.split('/')[2],
	}));

	// Seed the pairs

	await prisma.pair.createMany({
		data: symbolList.map((pair) => ({
			base: pair.base,
			quote: pair.quote,
			brokerId: pair.broker === 'COINBASE' ? coinbase.id : binance.id,
		})),
	});

	const pairs = await prisma.pair.findMany();

	// Prepare market data

	const marketData = cryptoData.map((crypto) => ({
		date: dayjs.utc(Number(crypto.timestamp)).toISOString(),
		open: Number(crypto.open),
		high: Number(crypto.high),
		low: Number(crypto.low),
		close: Number(crypto.close),
		volume: Number(crypto.volume),
		pairId: pairs.find(
			(pair) =>
				pair.base === crypto.base &&
				pair.quote === crypto.quote &&
				pair.brokerId ===
					(crypto.broker === 'COINBASE' ? coinbase.id : binance.id),
		)?.id as string,
	}));

	// Seed the market data 10000 rows at a time

	for (let i = 0; i < marketData.length; i += 10000) {
		await prisma.marketData.createMany({
			data: marketData.slice(i, i + 10000),
		});
	}
}

main()
	.catch((e) => {
		throw e;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
