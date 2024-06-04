import type { MarketData } from '../../types/marketDataType';
import { exponentialMovingAverage } from './exponentialMovingAverage';

export const movingAverageConvergenceDivergence = (
	marketData: MarketData,
	parameters: [
		{ name: 'longPeriod'; value: number },
		{ name: 'shortPeriod'; value: number },
		{ name: 'smoothing'; value: number },
	],
) => {
	const longPeriod = parameters.find((p) => p.name === 'longPeriod')
		?.value as number;
	const shortPeriod = parameters.find((p) => p.name === 'shortPeriod')
		?.value as number;
	const smoothing = parameters.find((p) => p.name === 'smoothing')
		?.value as number;
	const indicatorKey = `macd_${longPeriod}_${shortPeriod}_${smoothing}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	exponentialMovingAverage(marketData, [
		{ name: 'period', value: longPeriod },
		{ name: 'smoothing', value: smoothing },
	]);
	exponentialMovingAverage(marketData, [
		{ name: 'period', value: shortPeriod },
		{ name: 'smoothing', value: smoothing },
	]);

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 4,
		parameters: [
			{ name: 'longPeriod', value: longPeriod },
			{ name: 'shortPeriod', value: shortPeriod },
			{ name: 'smoothing', value: smoothing },
		],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		marketData.data[i][6] = {
			...marketData.data[i][6],
			[indicatorKey]: {
				value:
					(marketData.data[i][6][`ema_${shortPeriod}_${smoothing}`]
						.value as number) -
					(marketData.data[i][6][`ema_${longPeriod}_${smoothing}`]
						.value as number),
			},
		};
	}

	return indicatorKey;
};
