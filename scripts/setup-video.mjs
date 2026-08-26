import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const headers={'User-Agent':'TrendFinder-video-setup'};
const releaseResponse=await fetch('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',{headers});
if(!releaseResponse.ok)throw new Error(`GitHub API HTTP ${releaseResponse.status}`);
const release=await releaseResponse.json();
const asset=release.assets.find(item=>item.name==='yt-dlp.exe');
if(!asset?.digest?.startsWith('sha256:'))throw new Error('A versão oficial não possui checksum SHA-256.');
const binaryResponse=await fetch(asset.browser_download_url,{headers});
if(!binaryResponse.ok)throw new Error(`Download HTTP ${binaryResponse.status}`);
const bytes=Buffer.from(await binaryResponse.arrayBuffer());
const digest=createHash('sha256').update(bytes).digest('hex');
if(digest!==asset.digest.slice(7))throw new Error('O checksum do yt-dlp não confere.');
const tools=path.join(process.cwd(),'tools');await mkdir(tools,{recursive:true});await writeFile(path.join(tools,'yt-dlp.exe'),bytes);
console.log(`yt-dlp ${release.tag_name} instalado e verificado.`);
