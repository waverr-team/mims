import { exponentialMovingAverage } from './exponentialMovingAverage';
import { movingAverageConvergenceDivergence } from './movingAverageConvergenceDivergence';
import { periodShift } from './periodShift';
import { relativeStrengthIndex } from './relativeStrengthIndex';
import { simpleMovingAverage } from './simpleMovingAverage';
import { bollingerBands } from './bollingerBands';
import { fibonacciRetracement } from './fibonacciRetracement';

export const indicatorsFunctions = {
	sma: simpleMovingAverage,
	ema: exponentialMovingAverage,
	rsi: relativeStrengthIndex,
	macd: movingAverageConvergenceDivergence,
	shift: periodShift,
	bollinger: bollingerBands,
	fib: fibonacciRetracement,
};
