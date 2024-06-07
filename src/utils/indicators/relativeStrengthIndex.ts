import type { MarketData } from '../../types/marketDataType';

export const relativeStrengthIndex = (
	marketData: MarketData,
	parameters: [{ name: 'period'; value: number }],
) => {
	const period = parameters[0].value;
	const indicatorKey = `rsi_${period}`;

	if (
		indicatorKey in marketData.indicatorKeys ||
		indicatorKey in marketData.data[0][6]
	) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 3,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else {
			const gains: number[] = [];
			const losses: number[] = [];

			for (let j = i - period + 1; j <= i; j++) {
				const diff = marketData.data[j][4] - marketData.data[j - 1][4];
				if (diff > 0) {
					gains.push(diff);
				} else {
					losses.push(-diff);
				}
			}

			const avgGain = gains.reduce((acc, curr) => acc + curr, 0) / period;
			const avgLoss = losses.reduce((acc, curr) => acc + curr, 0) / period;

			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					value: 100 - 100 / (1 + avgGain / avgLoss),
				},
			};
		}
	}

	return indicatorKey;
};
