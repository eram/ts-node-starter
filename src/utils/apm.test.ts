import {
  Counter, Meter, Histogram, apm, count,
} from "./apm";
import { sleep } from "./asyncs";

describe("Counter tests", () => {

  afterEach(() => {
    apm.reset(true);
  });

  test("counter", () => {
    const cnt = Counter.instance("cnt");
    expect(cnt.val).toEqual(0);
    cnt.add(2);
    expect(cnt.val).toEqual(2);
    cnt.dec();
    expect(cnt.val).toEqual(1);
    expect(cnt.isUsed).toBeTruthy();
    cnt.reset();
    expect(cnt.val).toEqual(0);
  });

  test("count", () => {
    count("test1");
    count("test2");
    const test1 = count("test1");
    expect(test1).toEqual(2);
  });

  test("meter", async () => {
    const mtr = Meter.instance("mtr", { _tickInterval: 10, _debug: false });
    mtr.add();
    expect(mtr.val).toEqual(0);
    await sleep(10);
    expect(mtr.val).toBeGreaterThan(0);
    expect(mtr.val).toBeLessThan(1);
    expect(mtr.isUsed).toBeTruthy();
  });

  test("histogram empty", () => {
    const hist = Histogram.instance("hist");
    expect(hist.isUsed).toBeFalsy();
    expect(hist.val).toEqual(undefined);
  });

  test("histogram variance", () => {
    const hist = Histogram.instance("hist", { _defVal: "median" });
    expect(hist.isUsed).toBeFalsy();
    hist.add(1);
    hist.add(2);
    expect(hist.val).toEqual(1.5); // median
    expect(hist.fullResults()).toEqual({
      count: 2,
      ema: 1 + (2 / 3),
      max: 2,
      mean: 1.5,
      median: 1.5,
      min: 1,
      p75: 2,
      p95: 2,
      p99: 2,
      p999: 2,
      sum: 3,
      variance: 0.5,
    });
  });

  test("histogram p75", () => {
    const hist = Histogram.instance("hist", { _defVal: "p75" });
    expect(hist.isUsed).toBeFalsy();
    hist.add(1);
    hist.add(2);
    expect(hist.val).toEqual(2); // p75
  });

  test("big histogram - sample is rotated", () => {
    const hist = Histogram.instance("hist", { _defVal: "count" });
    for (let i = 0; i < 1030; i++) hist.add(i);
    expect(hist.val).toEqual(1030);
    expect(hist._sample.toArray().length).toBeLessThan(1030);
  });

  test("getAll", async () => {
    const cnt = Counter.instance("cnt");
    cnt.add(2);
    const mtr = Meter.instance("mtr", { _tickInterval: 10, _debug: false });
    mtr.add();
    await sleep(10);
    const hist = Histogram.instance("hist", { _defVal: "p75" });
    hist.add(1);
    hist.add(2);

    const str = JSON.stringify(apm.getAll());
    expect(str.length).toBeGreaterThan(10);
    expect(str).toEqual("{\"counters\":{\"cnt\":2},\"meters\":{\"mtr\":0.02},\"histograms\":{\"hist\":{\"0.5\":1.5,\"0.75\":2,\"0.95\":2,\"0.99\":2,\"0.999\":2}}}");
  });

  test("counters merge", () => {
    const cnt1 = Counter.instance("cnt1");
    cnt1.add();

    const cnt2 = Counter.instance("cnt2");
    cnt2.add();

    const merge = Counter.instance("merge");
    merge.merge(cnt1);
    merge.merge(cnt2);

    expect(merge.val).toEqual(2);

    // merge in create
    const cnt3 = Counter.instance("cnt1"); // same as above cnt1
    expect(cnt3.val).toEqual(cnt1.val);

    const cnt4 = Counter.instance("cnt1", { _count: 5 }); // same as above cnt1
    expect(cnt1.val).toEqual(6);
    expect(cnt4.val).toEqual(cnt1.val);
  });

  test("meters merge", async () => {
    const mtr1 = Meter.instance("mtr1", { _tickInterval: 10, _debug: false });
    mtr1.add(1);

    const mtr2 = Meter.instance("mtr2", { _tickInterval: 10, _debug: false });
    mtr2.add(1);

    await sleep(10);

    expect(mtr1.val).toEqual(0.02);
    expect(mtr2.val).toEqual(0.02);

    const merge = Meter.instance("merge");
    merge.merge(mtr1);
    merge.merge(mtr2);
    expect(merge.val).toEqual(0.03);

    mtr1.merge(mtr2);
    expect(mtr1.val).toEqual(merge.val);

    // merge in create
    const mtr3 = Meter.instance("mtr1"); // same as above mtr1
    expect(mtr3.val).toEqual(mtr1.val);

    const mtr4 = Meter.instance("mtr1", mtr2); // same as above mtr1
    expect(mtr4.val).toEqual(mtr1.val);
    expect(mtr4.val).toEqual(0.05);
  });

  test("histogram merge", () => {
    const hst1 = Histogram.instance("hst1");
    hst1.add(1);
    hst1.add(2);

    const hst2 = Histogram.instance("hst2");
    hst2.add(1);
    hst2.add(2);

    expect(hst1.val).toEqual(1.5);
    expect(hst2.val).toEqual(1.5);

    const merge = Histogram.instance("merge");
    merge.merge(hst1);
    merge.merge(hst2);

    expect(merge.val).toEqual(1.5);

    // merge in create
    const mtr3 = Histogram.instance("hst1");        // same as above hst1
    expect(mtr3.val).toEqual(hst1.val);

    const mtr4 = Histogram.instance("hst1", hst2);  // same as above hst1
    expect(mtr4.val).toEqual(1.5);
  });
});
