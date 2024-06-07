import type { MarketData } from '../../types/marketDataType';
import { simpleMovingAverage } from './simpleMovingAverage';
export const bollingerBands = (
	marketData: MarketData,
	parameters: [
		{ name: 'period'; value: number },
		{ name: 'deviation'; value: number },
	],
) => {
	const period = parameters.find((p) => p.name === 'period')?.value as number;
	const deviation = parameters.find((p) => p.name === 'deviation')
		?.value as number;
	const indicatorKey = `bb_${period}_${deviation}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 1,
		parameters: [
			{ name: 'period', value: period },
			{ name: 'deviation', value: deviation },
		],
	};

	const smaKey = simpleMovingAverage(marketData, [
		{ name: 'period', value: period },
	]);

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else {
			const sma = marketData.data[i][6][smaKey]?.value as number;

			let sumDeviation = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sumDeviation += (marketData.data[j][4] - sma) ** 2;
			}
			const std = Math.sqrt(sumDeviation / period);

			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					upper: sma + deviation * std,
					lower: sma - deviation * std,
				},
			};
		}
	}

	return indicatorKey;
};
