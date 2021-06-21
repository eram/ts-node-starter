//
// Some shell API wrappers stdio prompt and running commands
//
import { exec } from "child_process";
import readline from "readline";
import { CustomError, errno } from "./customError";


// run a shell command with an optional spinner. see man system(3)
export async function system(command: string, throwOnError = false, spinner = false) {
  return new Promise((resolve, reject) => {

    const clock = ["-\r", "\\\r", "|\r", "/\r"];
    let clockIdx = 0;
    let interval: NodeJS.Timeout;
    if (spinner) {
      interval = setInterval(() => process.stdout.write(clock[clockIdx++ % clock.length]), 1000);
    }

    // console.log(">", command);
    const child = exec(command);
    child.stdout.on("data", (data) => {
      process.stdout.write(data);
    });
    child.stderr.on("data", (data) => {
      process.stderr.write(data);
    });
    child.addListener("error", (err) => {
      reject(err);
    });
    child.addListener("exit", (code) => {
      if (interval) clearInterval(interval);
      if (code === 0) {
        if (spinner) console.log("%cOK", "color:green");
        resolve(code);
      } else if (throwOnError) {
        reject(new CustomError(`Failed with exit code ${errno.strError(code)}`, code));
      } else {
        resolve(code);
      }
    });
  });
}

// prompt stdout for one-line input on stdin with default value
export async function prompt(ask: string, defVal: string) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface(process.stdin, process.stdout);
    rl.question(`${ask} [${defVal}]: `, (answer) => {
      answer = answer || defVal;
      rl.close();
      resolve(answer);
    });
    rl.on("SIGINT", () => reject(new Error("SIGINT")));
  });
}

