import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
const root=process.cwd();
const worker=spawn(process.execPath,[path.join(root,'worker','video-worker.mjs')],{cwd:root,stdio:'inherit',windowsHide:true});
const vinext=path.join(root,'node_modules','vinext','dist','cli.js');
const web=spawn(process.execPath,[vinext,'dev',...process.argv.slice(2)],{cwd:root,stdio:'inherit',windowsHide:true});
let closing=false;function close(code=0){if(closing)return;closing=true;worker.kill();web.kill();process.exitCode=code}
worker.on('exit',code=>{if(!closing&&code)close(code)});web.on('exit',code=>close(code||0));process.on('SIGINT',()=>close(0));process.on('SIGTERM',()=>close(0));
