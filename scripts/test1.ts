import * as http from 'http';
http.createServer(function (_req: any, res: { writeHead: (arg0: number, arg1: { 'Content-Type': string; }) => void; write: (arg0: string) => void; end: () => void; }) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(8000);
console.log('listening...');