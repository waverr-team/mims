import { exponentialMovingAverage } from './exponentialMovingAverage';
import { movingAverageConvergenceDivergence } from './movingAverageConvergenceDivergence';
import { periodShift } from './periodShift';
import { relativeStrengthIndex } from './relativeStrengthIndex';
import { simpleMovingAverage } from './simpleMovingAverage';

export const indicatorsFunctions = {
	sma: simpleMovingAverage,
	ema: exponentialMovingAverage,
	rsi: relativeStrengthIndex,
	macd: movingAverageConvergenceDivergence,
	shift: periodShift,
};
