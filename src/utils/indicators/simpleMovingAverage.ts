import type { MarketData } from '../../types/marketDataType';

export const simpleMovingAverage = (
	marketData: MarketData,
	parameters: [{ name: 'period'; value: number }],
) => {
	const period = parameters[0].value;
	const indicatorKey = `sma_${period}`;

	if (
		indicatorKey in marketData.indicatorKeys ||
		indicatorKey in marketData.data[0][6]
	) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 1,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += marketData.data[j][4];
			}
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: sum / period },
			};
		}
	}

	return indicatorKey;
};
