import type { MarketData } from '../../types/marketDataType';

export const periodShift = (
	marketData: MarketData,
	parameters: [{ name: 'period'; value: number }],
) => {
	const period = parameters[0].value;
	const indicatorKey = `periodShift_${period}`;

	if (
		marketData.indicators.map((ik) => ik.indicatorKey).includes(indicatorKey)
	) {
		return indicatorKey;
	}

	marketData.indicators.push({
		indicatorKey,
		indicatorId: 5,
		parameters: [{ name: 'period', value: period }],
	});

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
