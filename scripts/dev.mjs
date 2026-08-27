import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
const root=process.cwd();
let worker=null;
try{const response=await fetch('http://127.0.0.1:4317/health',{signal:AbortSignal.timeout(1000)});if(!response.ok)throw new Error('worker unavailable');console.log('Reutilizando processador de vídeo em http://127.0.0.1:4317')}catch{worker=spawn(process.execPath,[path.join(root,'worker','video-worker.mjs')],{cwd:root,stdio:'inherit',windowsHide:true})}
const next=path.join(root,'node_modules','next','dist','bin','next');
const web=spawn(process.execPath,[next,'dev',...process.argv.slice(2)],{cwd:root,stdio:'inherit',windowsHide:true});
let closing=false;function close(code=0){if(closing)return;closing=true;worker?.kill();web.kill();process.exitCode=code}
worker?.on('exit',code=>{if(!closing&&code)close(code)});web.on('exit',code=>close(code||0));process.on('SIGINT',()=>close(0));process.on('SIGTERM',()=>close(0));
