#!{{NODE}}
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {reviewedArgs} from './reviewed-args.mjs';
const require=createRequire(import.meta.url);
const launcher=require.resolve('@openai/codex/bin/codex.js');
const child=spawn(process.execPath,[launcher,...reviewedArgs(process.argv.slice(2))],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error('Codex launcher failed:',error.message);process.exitCode=1});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0)});
