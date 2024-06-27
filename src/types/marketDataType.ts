export type MarketDataBlock = [
	date: string,
	open: number,
	high: number,
	low: number,
	close: number,
	volume: number,
	indicators: Record<string, Record<string, number | Date | null> | null>,
];

export interface MarketData {
	indicators: {
		indicatorId: number;
		indicatorKey: string;
		parameters: {
			name: string;
			value: number;
		}[];
	}[];
	data: Array<MarketDataBlock>;
}
