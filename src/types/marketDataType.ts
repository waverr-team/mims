export type MarketDataBlock = [
	date: string,
	open: number,
	high: number,
	low: number,
	close: number,
	volume: number,
	indicators: Record<string, Record<string, number | Date | null>>,
];

export interface MarketData {
	indicatorKeys: {
		[key: string]: {
			indicatorId: number;
			parameters: object;
		};
	};
	data: Array<MarketDataBlock>;
}
