// App entry point (TS)
// NOTE! You should not add anything to this file!
import {app} from './app';

app().then((rc: number) => {
  if (rc) { process.exit(rc); }
}).catch(err => {
  throw new Error(err);
});
