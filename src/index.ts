// App entry point (TS)
// NOTE! You shouold not add anything to this file!
import { main } from './main';

main().then((rc: number) => {
  if (rc) { process.exit(rc); }
}).catch(err => {
  throw new Error(err);
});
