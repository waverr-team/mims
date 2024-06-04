import { readFileSync } from 'node:fs';
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

	const coinbase = await prisma.broker.findFirst({
		where: {
			name: 'COINBASE',
		},
	});

	if (!coinbase) {
		throw new Error('Coinbase not found');
	}

	// Load raw_crypto.csv

	const csvFile = await readFileSync('./prisma/raw_crypto.csv', 'utf-8');

	const cryptoData = parse(csvFile, {
		columns: true,
		skip_empty_lines: true,
	}) as {
		symbol: string;
		open: string;
		high: string;
		low: string;
		close: string;
		volume: string;
		timestamp: string;
	}[];

	const symbolList = Array.from(
		new Set(cryptoData.map((crypto) => crypto.symbol)),
	).map((symbol) => ({
		base: symbol.split('/')[0],
		quote: symbol.split('/')[1],
	}));

	// Seed the pairs

	await prisma.pair.createMany({
		data: symbolList.map((pair) => ({
			base: pair.base,
			quote: pair.quote,
			brokerId: coinbase.id,
		})),
	});

	const pairs = await prisma.pair.findMany();

	// Prepare market data

	const marketData = cryptoData.map((crypto) => ({
		date: dayjs.utc(crypto.timestamp, 'YYYY-MM-DD HH:mm:ss').toISOString(),
		open: Number(crypto.open),
		high: Number(crypto.high),
		low: Number(crypto.low),
		close: Number(crypto.close),
		volume: Number(crypto.volume),
		pairId: pairs.find(
			(pair) =>
				pair.base === crypto.symbol.split('/')[0] &&
				pair.quote === crypto.symbol.split('/')[1],
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
