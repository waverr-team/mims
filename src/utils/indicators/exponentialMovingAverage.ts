import type { MarketData } from '../../types/marketDataType';

export const exponentialMovingAverage = (
	marketData: MarketData,
	parameters: [
		{ name: 'period'; value: number },
		{ name: 'smoothing'; value: number },
	],
) => {
	const period = parameters.find((p) => p.name === 'period')?.value as number;
	const smoothing = parameters.find((p) => p.name === 'smoothing')
		?.value as number;
	const indicatorKey = `ema_${period}_${smoothing}`;

	if (
		marketData.indicators.map((ik) => ik.indicatorKey).includes(indicatorKey)
	) {
		return indicatorKey;
	}

	marketData.indicators.push({
		indicatorKey,
		indicatorId: 2,
		parameters: [
			{ name: 'period', value: period },
			{ name: 'smoothing', value: smoothing },
		],
	});

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else if (i === period - 1) {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += marketData.data[j][4];
			}
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: sum / period },
			};
		} else {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					value:
						(marketData.data[i - 1][6][indicatorKey]?.value as number) *
							(1 - smoothing / (period + 1)) +
						(smoothing / (period + 1)) * marketData.data[i][4],
				},
			};
		}
	}

	return indicatorKey;
};
