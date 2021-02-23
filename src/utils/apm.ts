import { IDictionary, env, assert } from "./";
import { copyIn, merge as merge1 } from "./copyIn";

const counters: IDictionary<Counter> = {};
const meters: IDictionary<Meter> = {};
const histograms: IDictionary<Histogram> = {};

export const apm = {
  get counters() { return counters as Readonly<IDictionary<Readonly<Counter>>>; },

  get meters() { return meters as Readonly<IDictionary<Readonly<Meter>>>; },

  get histograms() { return histograms as Readonly<IDictionary<Readonly<Histogram>>>; },

  getAll() {
    const rc = {
      counters: {} as IDictionary<number>,
      meters: {} as IDictionary<number>,
      histograms: {} as IDictionary<Readonly<IDictionary<number>>>,
    };
    for (const k in counters) {
      rc.counters[k] = counters[k].val;
    }
    for (const k in meters) {
      rc.meters[k] = meters[k].val;
    }
    for (const k in histograms) {
      rc.histograms[k] = histograms[k].percentiles([0.5, 0.75, 0.95, 0.99, 0.999]);
    }
    return rc as Readonly<typeof rc>;
  },

  reset(deleteCounters = false) {
    [counters, meters, histograms].forEach(cnt => {
      Object.keys(cnt).forEach(key => {
        deleteCounters ? delete cnt[key] : cnt[key].reset();
      });
    });
  },
};

/***
 * the below is losly based on @pm2\io\build\main\utils\metrics library
 ***/

interface IApm<T> {
  reset: () => void;
  merge: (other: Readonly<T>) => T;
  add: (n: number) => void;
  readonly val: number;
  readonly isUsed: boolean;
}


class MovingAvg implements IApm<MovingAvg> {
  private _count = 0;
  private _rate = 0;
  private readonly _alpha: number;

  constructor(private readonly _timePeriod = 1 * 60 * 1000, private readonly _tickInterval = 5000) {
    this._alpha = 1 - Math.exp(-this._tickInterval / this._timePeriod);
  }

  reset() {
    this._count = 0;
    this._rate = 0;
  }

  add(n: number) {
    this._count += n;
  }

  tick() {
    const instantRate = this._count / this._tickInterval;
    this._count = 0;
    this._rate += (this._alpha * (instantRate - this._rate));
  }

  rate(timeUnit: number) {
    return this._rate * timeUnit;
  }

  merge(other: MovingAvg) {
    this._count += other._count;
    this._rate += other._rate;
    return this;
  }

  get val() { return this._count; }
  get isUsed() { return this._rate !== 0; }
}


class SortedElem {
  priority: number;
  value: number;
  timestamp: number;
}

class SortedArray<T extends SortedElem> extends Array<T> implements IApm<SortedArray<T>> {

  constructor(elems: T | T[] = [], scoreFn?: (elem: SortedElem) => number) {
    super();
    this.addElems(Array.isArray(elems) ? elems : [elems]);
    if (scoreFn) this._score = scoreFn;
  }

  addElems(elems: T[]) {
    elems.forEach(elem => {
      this.push(elem);
      this._bubble(this.length - 1);
    });
  }

  first() {
    return this[0];
  }

  pop() {
    const root = this[0];
    const last = [].pop.bind(this)();
    //const last = this.pop();
    if (this.length > 0) {
      this[0] = last;
      this._sink(0);
    }
    return root;
  }

  reset() {
    this.length = 0;
  }

  merge(other: SortedArray<T>) {
    this.addElems(other);
    return this;
  }

  // interface functions needed bot not used
  add() { throw new Error("unused"); }
  get val() { return this.first().value; }
  get isUsed() { return this.length > 0; }


  private _bubble(bubbleIndex: number) {
    const bubbleElement = this[bubbleIndex];
    const bubbleScore = this._score(bubbleElement);
    while (bubbleIndex > 0) {
      const parentIndex = this._parentIdx(bubbleIndex);
      const parentElement = this[parentIndex];
      const parentScore = this._score(parentElement);
      if (bubbleScore <= parentScore)
        break;
      this[parentIndex] = bubbleElement;
      this[bubbleIndex] = parentElement;
      bubbleIndex = parentIndex;
    }
  }

  private _sink(sinkIndex: number) {
    const sinkElement = this[sinkIndex];
    const sinkScore = this._score(sinkElement);
    const length = this.length;
    while (true) {
      let swapIndex;
      let swapScore;
      let swapElement;
      const childIndexes = this._childIdx(sinkIndex);
      for (let i = 0; i < childIndexes.length; i++) {   // eslint-disable-line
        const childIndex = childIndexes[i];
        if (childIndex >= length)
          break;
        const childElement = this[childIndex];
        const childScore = this._score(childElement);
        if (childScore > sinkScore && (swapScore === undefined || swapScore < childScore)) {
          swapIndex = childIndex;
          swapScore = childScore;
          swapElement = childElement;
        }
      }
      if (swapIndex === undefined)
        break;
      this[swapIndex] = sinkElement;
      this[sinkIndex] = swapElement;
      sinkIndex = swapIndex;
    }
  }

  private _parentIdx(index: number) { return Math.floor((index - 1) / 2); }
  private _childIdx(index: number) { return [2 * index + 1, 2 * index + 2]; }
  private _score(elem: SortedElem) { return elem.value; }
}


// Exponentially Decaying Sample
class Sample implements IApm<Sample> {

  private readonly _elems = new SortedArray(undefined, (elem: SortedElem) => {
    return -elem.priority;
  });
  private readonly _rescaleInterval = 1 * 1000 * 60 * 60;
  private readonly _alpha = 0.015;
  private readonly _size = 1028;
  private _landmark: number;
  private _nextRescale: number;

  reset() {
    this._elems.reset();
  }

  merge(other: Sample) {

    // we may get here after sample has been JSONified
    assert(other._elems instanceof Array);
    other._elems.forEach(elem => { this.add(elem.value, elem.timestamp); });
    return this;
  }

  add(value: number, timestamp?: number) {
    const now = Date.now();
    if (!this._landmark) {
      this._landmark = now;
      this._nextRescale = this._landmark + this._rescaleInterval;
    }
    timestamp = timestamp || now;
    const newSize = this._elems.length + 1;
    const elem: SortedElem = {
      priority: this._priority(timestamp - this._landmark),
      value,
      timestamp,
    };

    if (newSize <= this._size) {
      this._elems.addElems([elem]);
    } else if (elem.priority > this._elems.first().priority) {
      this._elems.pop();
      this._elems.addElems([elem]);
    }
    if (now >= this._nextRescale)
      this._rescale(now);
  }

  get val() { return this._elems.first().value; }
  get isUsed() { return this._elems.length > 0; }

  toArray(): number[] {
    return this.isUsed ? this._elems.map(elem => elem.value) : [];
  }

  private _weight(age: number) { return Math.exp(this._alpha * (age / 1000)); }

  private _priority(age: number) { return this._weight(age) / Math.random(); }

  private _rescale(now: number = Date.now()) {
    const oldLandmark = this._landmark;
    this._landmark = now;
    this._nextRescale = now + this._rescaleInterval;
    const factor = this._priority(-(this._landmark - oldLandmark));
    this._elems.forEach((elem) => {
      elem.priority *= factor;
    });
  }
}


class CounterParams {
  _count = 0;
}

export class Counter extends CounterParams implements IApm<CounterParams> {

  private constructor(public name: string, params: Partial<CounterParams>) {
    super();
    this.merge(params);
    counters[name] = this;
  }

  static instance(name: string, params: Partial<CounterParams> = {}) {
    const cnt = counters[name];
    return cnt?.merge(params) || new Counter(name, params);
  }

  reset(_count = 0) {
    this._count = _count;
  }

  merge(other: Partial<CounterParams>) {
    if (other._count) this.add(other._count);
    return this;
  }

  get val() {
    return this._count;
  }

  get isUsed() {
    return this._count != 0;
  }

  add(n = 1) {
    this._count += n;
    return this._count;
  }

  dec(n = 1) { return this.add(-n); }
}


class MeterParams {
  _tickInterval = 1000;   // msec
  _seconds = 1;           // seconds
  _timeframe = 60;        // minutes
  _rate: MovingAvg;
  _debug?: boolean;
}

export class Meter extends MeterParams implements IApm<MeterParams> {

  private constructor(public name: string, params: Partial<MeterParams>) {

    super();
    this._rate = new MovingAvg(this._timeframe * 1000, this._tickInterval);
    if (params) this.merge(params);
    meters[name] = this;

    if (this._debug === undefined) { this._debug = env.isDebugging; }
    if (this._debug) {
      return;
    }

    //TODO: merge all meters' intervals into a single call
    setInterval((self: Meter) => {
      self._rate.tick();
    }, this._tickInterval, this).unref();
  }

  static instance(name: string, params: Partial<MeterParams> = {}) {
    const mtr = meters[name];
    return mtr?.merge(params) || new Meter(name, params);
  }

  reset() {
    this._rate.reset();
  }

  merge(other: Partial<MeterParams>) {

    copyIn<Meter>(this, other, ["_rate", "_interval"]);

    if (other._rate) {
      this._rate.merge(other._rate);
    }
    return this;
  }

  add(n = 1) {
    this._rate.add(n);
    return this.val;
  }

  get val() {
    return Math.round(this._rate.rate(this._seconds * 1000) * 100) / 100;
  }

  get isUsed() {
    return this._rate.isUsed;
  }
}


class HistogramParams {
  _defVal: "count" | "ema" | "max" | "mean" | "median" | "min" | "p75" | "p95" | "p99" | "p999" | "sum" | "variance" = "median";
  _min: number;
  _max: number;
  _count = 0;
  _sum = 0;
  _varianceM = 0;
  _varianceS = 0;
  _ema = 0;
  _sample = new Sample();
}

export class Histogram extends HistogramParams implements IApm<HistogramParams> {

  private readonly _valFn: () => number;

  private constructor(public name: string, params: Partial<HistogramParams>) {
    super();
    if (params) this.merge(params);
    histograms[name] = this;

    const methods = {
      count: () => this.count,
      ema: () => this.ema,
      max: () => this.max,
      mean: this._calculateMean.bind(this),
      median: this._getPercentile.bind(this, 0.5),
      min: () => this.min,
      p75: this._getPercentile.bind(this, 0.75),
      p95: this._getPercentile.bind(this, 0.95),
      p99: this._getPercentile.bind(this, 0.99),
      p999: this._getPercentile.bind(this, 0.999),
      sum: () => this.sum,
      variance: this._calculateVariance.bind(this),
    };

    this._valFn = methods[this._defVal];
    if (!this._defVal) {
      throw new Error("Invalid function");
    }
  }

  static instance(name: string, params: Partial<HistogramParams> = {}) {
    const hst = histograms[name];
    return hst?.merge(params) || new Histogram(name, params);
  }

  reset() {
    this._sample.reset();
    this._min = this._max = this._count = this._sum
      = this._varianceM = this._varianceS = this._ema = 0;
  }

  merge(other: Partial<HistogramParams>) {
    copyIn<Histogram>(this, other, ["_sample"]);

    if (other._sample) {
      // we may get here after sample has been JSONified
      let newSample = other._sample;
      if (!(newSample instanceof Sample)) {
        newSample = merge1({}, other._sample);
        Object.setPrototypeOf(newSample, Sample.prototype);
      }
      newSample.toArray().forEach(sample => { this.add(sample); });
    }
    return this;
  }

  add(value: number) {
    this._count++;
    this._sum += value;
    this._sample.add(value);
    this._updateMin(value);
    this._updateMax(value);
    this._updateVariance(value);
    this._updateEma(value);
  }

  percentiles(percentiles: number[]) {
    const values = this._sample.toArray()
      .sort((a, b) => (a === b) ? 0 : a - b);
    const results: IDictionary<number> = {};
    percentiles.forEach((percentile) => {
      if (!values.length) {
        results[percentile] = undefined;
        return;
      }
      const pos = percentile * (values.length + 1);
      if (pos < 1) {
        results[percentile] = values[0];
      } else if (pos >= values.length) {
        results[percentile] = values[values.length - 1];
      } else {
        const lower = values[Math.floor(pos) - 1];
        const upper = values[Math.ceil(pos) - 1];
        results[percentile] = Math.round(1000 * (lower + (pos - Math.floor(pos)) * (upper - lower))) / 1000;
      }
    });
    return results;
  }

  get val() {
    return (typeof this._valFn === "function") ? this._valFn() : this._valFn;
  }

  get min() {
    return this._min;
  }

  get max() {
    return this._max;
  }

  get sum() {
    return this._sum;
  }

  get count() {
    return this._count;
  }

  get ema() {
    return this._ema;
  }

  fullResults() {
    const percentiles = this.percentiles([0.5, 0.75, 0.95, 0.99, 0.999]);
    return {
      count: this._count,
      ema: this._ema,
      max: this._max,
      mean: this._calculateMean(),
      median: percentiles[0.5],
      min: this._min,
      p75: percentiles[0.75],
      p95: percentiles[0.95],
      p99: percentiles[0.99],
      p999: percentiles[0.999],
      sum: this._sum,
      variance: this._calculateVariance(),
    };
  }

  get isUsed() {
    return this._count > 0;
  }

  private _updateMin(value: number) {
    if (this._min === undefined || value < this._min) {
      this._min = value;
    }
  }

  private _updateMax(value: number) {
    if (this._max === undefined || value > this._max) {
      this._max = value;
    }
  }

  private _updateVariance(value: number) {
    if (this._count === 1)
      return this._varianceM = value;
    const oldM = this._varianceM;
    this._varianceM += ((value - oldM) / this._count);
    this._varianceS += ((value - oldM) * (value - this._varianceM));
  }

  private _updateEma(value: number) {
    if (this._count <= 1)
      return this._ema = this._calculateMean();
    const alpha = 2 / (1 + this._count);
    this._ema = value * alpha + this._ema * (1 - alpha);
  }

  private _calculateMean() { return (!this._count) ? 0 : this._sum / this._count; }

  private _calculateVariance() { return (this._count <= 1) ? undefined : this._varianceS / (this._count - 1); }

  private _getPercentile(p: number) { return this.percentiles([p])[p]; }
}


// this is a shorthand to counters
export function count(name: string, n = 1) {
  const cnt = counters[name] || Counter.instance(name);
  return cnt.add(n);
}

// this is a shorthand to meters
export function meter(name: string, n = 1) {
  const mtr = meters[name] || Meter.instance(name);
  return mtr.add(n);
}
