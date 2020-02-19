// eslint-disable-next-line @typescript-eslint/no-require-imports
import io = require('@pm2/io');

import { ProcCounters } from './utils';
import { MetricMeasurements } from '@pm2/io/build/main/services/metrics';
import Meter from '@pm2/io/build/main/utils/metrics/meter';
import Histogram from '@pm2/io/build/main/utils/metrics/histogram';
import Counter from '@pm2/io/build/main/utils/metrics/counter';
import { IOConfig } from '@pm2/io/build/main/pmx';

const ioCfg: IOConfig = {
  // Automatically catch unhandled errors
  catchExceptions: true,
  // Configure the metrics to add automatically to your process
  metrics: {
    eventLoop: true,
    network: false,
    http: true,
    // gc: true,
    v8: true
  },
  // Configure the default actions that you can run
  actions: {
    eventLoopDump: true
  },
  // Configure availables profilers that will be exposed
  profiling: {
    // Toggle the CPU profiling actions
    cpuJS: true,
    // Toggle the heap snapshot actions
    heapSnapshot: true,
    // Toggle the heap sampling actions
    heapSampling: true,
    // Force a specific implementation of profiler
    // available:
    //  - 'addon' (using the v8-profiler-node8 addon)
    //  - 'inspector' (using the "inspector" api from node core)
    //  - 'none' (disable the profilers)
    //  - 'both' (will try to use inspector and fallback on addon if available)
    implementation: 'both',
  },
  /*
  // Configure the transaction tracing options
  tracing: {
    // Enabled the distributed tracing feature.
    enabled: boolean
    // If you want to report a specific service name
    // the default is the same as in apmOptions
    serviceName?: string
    // Generate trace for outgoing request that aren't connected to a incoming one
    // default is false
    outbound?: boolean
    // Determines the probability of a request to be traced. Ranges from 0.0 to 1.0
    // default is 0.5
    samplingRate?: number,
    // Add details about databases calls (redis, mongodb etc)
    detailedDatabasesCalls?: boolean,
    // Ignore specific incoming request depending on their path
    ignoreIncomingPaths?: Array < IgnoreMatcher < httpModule.IncomingMessage >>
      // Ignore specific outgoing request depending on their url
      ignoreOutgoingUrls ?: Array < IgnoreMatcher < httpModule.ClientRequest >>
      // Set to true when wanting to create span for raw TCP connection
      // instead of new http request
      createSpanWithNet: boolean
  }
    // If you want to connect to PM2 Enterprise without using PM2, you should enable
    // the standalone mode
    // default is false
    standalone: false
  // Define custom options for the standalone mode
  apmOptions ?: {
      // public key of the bucket to which the agent need to connect
      publicKey: string
    // Secret key of the bucket to which the agent need to connect
    secretKey: string
    // The name of the application/service that will be reported to PM2 Enterprise
    appName: string
        // The name of the server as reported in PM2 Enterprise
        // default is os.hostname()
        serverName ?: string
    // Broadcast all the logs from your application to our backend
    sendLogs?: Boolean
    // Avoid to broadcast any logs from your application to our backend
    // Even if the sendLogs option set to false, you can still see some logs
    // when going to the log interface (it automatically trigger broacasting log)
    disableLogs?: Boolean
    // Since logs can be forwared to our backend you may want to ignore specific
    // logs (containing sensitive data for example)
    logFilter?: string | RegExp
        // Proxy URI to use when reaching internet
        // Supporting socks5,http,https,pac,socks4
        // see https://github.com/TooTallNate/node-proxy-agent
        // example: socks5://username:password@some-socks-proxy.com:9050
        proxy ?: string
    }
    */
};

class Counters extends ProcCounters {

  requestsInPorgress: Counter;
  requests: Meter;
  requestsLatency: Histogram;

  constructor() {
    super();
    io.init(ioCfg);

    this.requestsInPorgress = io.counter({
      name: 'reqs-inp',
    });

    this.requests = io.meter({
      name: 'reqs/sec',
    });

    this.requestsLatency = io.histogram({
      name: 'req-latency',
      measurement: MetricMeasurements.mean
    });
  }
}

const counters = new Counters();

export function getCounters() {
  return counters;
}

