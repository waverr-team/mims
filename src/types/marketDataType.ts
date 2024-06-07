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
	indicatorKeys: {
		[key: string]: {
			indicatorId: number;
			parameters: {
				name: string;
				value: number;
			}[];
		};
	};
	data: Array<MarketDataBlock>;
}
