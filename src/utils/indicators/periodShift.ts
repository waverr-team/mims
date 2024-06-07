import type { MarketData } from '../../types/marketDataType';

export const periodShift = (
	marketData: MarketData,
	parameters: [{ name: 'period'; value: number }],
) => {
	const period = parameters[0].value;
	const indicatorKey = `periodShift_${period}`;

	if (
		indicatorKey in marketData.indicatorKeys ||
		indicatorKey in marketData.data[0][6]
	) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 5,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: null,
			};
		} else {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					value: marketData.data[i - period][4],
				},
			};
		}
	}

	return indicatorKey;
};
