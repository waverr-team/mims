import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isBeetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(isBeetween);

export default class Interval {
	constructor(
		public start: dayjs.Dayjs,
		public end: dayjs.Dayjs,
	) {}

	static fromString(start: string, end: string): Interval {
		return new Interval(dayjs.utc(start), dayjs.utc(end));
	}

	static fromArray(intervals: { start: string; end: string }[]): Interval[] {
		return intervals.map((interval) =>
			Interval.fromString(interval.start, interval.end),
		);
	}

	toObject() {
		return {
			start: this.start.toISOString(),
			end: this.end.toISOString(),
		};
	}

	static areIntervalsOverlapping(
		interval1: Interval,
		interval2: Interval,
	): boolean {
		return (
			interval1.start.isBetween(interval2.start, interval2.end, null, '[]') ||
			interval1.end.isBetween(interval2.start, interval2.end, null, '[]') ||
			interval2.start.isBetween(interval1.start, interval1.end, null, '[]') ||
			interval2.end.isBetween(interval1.start, interval1.end, null, '[]')
		);
	}

	minus(subtractionInterval: Interval): Interval[] {
		// Check if the intervals are overlapping
		if (!Interval.areIntervalsOverlapping(this, subtractionInterval)) {
			return [this];
		}

		// Subtract the interval from the current interval
		if (
			this.start.isBetween(
				subtractionInterval.start,
				subtractionInterval.end,
				null,
				'[]',
			) &&
			this.end.isBetween(
				subtractionInterval.start,
				subtractionInterval.end,
				null,
				'[]',
			)
		) {
			return [];
		}

		if (
			subtractionInterval.start.isBetween(this.start, this.end, null, '[]') &&
			subtractionInterval.end.isBetween(this.start, this.end, null, '[]')
		) {
			if (this.start.isSame(subtractionInterval.start)) {
				return [new Interval(subtractionInterval.end, this.end)];
			}

			if (this.end.isSame(subtractionInterval.end)) {
				return [new Interval(this.start, subtractionInterval.start)];
			}

			return [
				new Interval(this.start, subtractionInterval.start),
				new Interval(subtractionInterval.end, this.end),
			];
		}

		if (
			this.start.isBetween(
				subtractionInterval.start,
				subtractionInterval.end,
				null,
				'[]',
			)
		) {
			return [new Interval(subtractionInterval.end, this.end)];
		}

		if (
			this.end.isBetween(
				subtractionInterval.start,
				subtractionInterval.end,
				null,
				'[]',
			)
		) {
			return [new Interval(this.start, subtractionInterval.start)];
		}

		return [];
	}

	add(additionInterval: Interval): Interval[] {
		// Check if the intervals are overlapping
		if (!Interval.areIntervalsOverlapping(this, additionInterval)) {
			return [this, additionInterval];
		}

		// Add the interval to the current interval
		if (
			additionInterval.start.isBetween(this.start, this.end, null, '[]') &&
			additionInterval.end.isBetween(this.start, this.end, null, '[]')
		) {
			return [this];
		}

		if (
			this.start.isBetween(
				additionInterval.start,
				additionInterval.end,
				null,
				'[]',
			)
		) {
			return [new Interval(additionInterval.start, this.end)];
		}

		if (
			this.end.isBetween(
				additionInterval.start,
				additionInterval.end,
				null,
				'[]',
			)
		) {
			return [new Interval(this.start, additionInterval.end)];
		}

		return [additionInterval];
	}

	static combine(intervals: Interval[]): Interval[] {
		const combinedIntervals: Interval[] = [];

		for (const interval of intervals) {
			let isIntervalCombined = false;

			for (const combinedInterval of combinedIntervals) {
				if (Interval.areIntervalsOverlapping(interval, combinedInterval)) {
					combinedIntervals.splice(
						combinedIntervals.indexOf(combinedInterval),
						1,
						...interval.add(combinedInterval),
					);
					isIntervalCombined = true;
				}
			}

			if (!isIntervalCombined) {
				combinedIntervals.push(interval);
			}
		}

		return combinedIntervals;
	}
}
