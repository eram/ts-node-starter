// App entry point (JS)
// NOTE! You shouold not add anything to this file!
require('ts-node').register();
const main = require('./main').main;

main().then((rc) => {
  if (rc) { process.exit(rc); }
}).catch(err => {
  throw new Error(err);
});
