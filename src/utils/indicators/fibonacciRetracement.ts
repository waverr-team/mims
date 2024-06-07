import type { MarketData } from '../../types/marketDataType';

export const fibonacciRetracement = (
	marketData: MarketData,
	parameters: [{ name: 'period'; value: number }],
) => {
	const period = parameters.find((param) => param.name === 'period')
		?.value as number;
	const indicatorKey = `fib_${period}`;

	if (
		indicatorKey in marketData.indicatorKeys ||
		indicatorKey in marketData.data[0][6]
	) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 6,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else {
			const max = marketData.data
				.slice(i - period + 1, i + 1)
				.reduce(
					(acc, curr) => Math.max(acc, curr[2]),
					Number.NEGATIVE_INFINITY,
				);

			const min = marketData.data
				.slice(i - period + 1, i + 1)
				.reduce(
					(acc, curr) => Math.min(acc, curr[3]),
					Number.POSITIVE_INFINITY,
				);

			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					100.0: max,
					78.6: min + (max - min) * 0.786,
					61.8: min + (max - min) * 0.618,
					50.0: min + (max - min) * 0.5,
					38.2: min + (max - min) * 0.382,
					23.6: min + (max - min) * 0.236,
					0.0: min,
				},
			};
		}
	}

	return indicatorKey;
};
