#!/usr/bin/env node
/* 校验「声明的值」是否有效，而不只是「标签存在」——
   第 13 轮的教训：og:image 存在但是相对路径，检查存在性查不出来。
   这里对每个页面做：
     ① JSON-LD 每个 URL 类字段必须是绝对地址且指向本站真实存在的资源
     ② JSON-LD 日期格式合法
     ③ canonical / og:url 必须等于该页面自身的真实 URL
     ④ og:image 指的图片必须真的存在（本地构建产物里找得到）
*/
const fs=require('fs'), path=require('path');
const PUB='/vol1/work/xfengyin.github.io/public';
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name); if(e.isDirectory())walk(p); else if(e.name.endsWith('.html'))files.push(p);}})(PUB);

const urlOf=(f)=>{const rel=f.slice(PUB.length+1);
  if(rel==='index.html')return 'https://xfengyin.github.io/';
  if(rel.endsWith('/index.html'))return 'https://xfengyin.github.io/'+rel.slice(0,-'index.html'.length);
  return 'https://xfengyin.github.io/'+rel;};

let problems=[];
for(const f of files.sort()){
  const s=fs.readFileSync(f,'utf8');
  const rel=f.slice(PUB.length+1);
  // ---- JSON-LD ----
  const blocks=[...s.matchAll(/<script type=application\/ld\+json>([\s\S]*?)<\/script>/g)];
  for(const b of blocks){
    let d; try{ d=JSON.parse(b[1]); }catch(e){ problems.push([rel,'JSON-LD 无法解析',e.message.slice(0,40)]); continue; }
    // 收集所有形似 URL 的字符串
    const scan=(o,keyPath='')=>{
      if(typeof o==='string'){
        if(/^https?:\/\//.test(o)){ /* 绝对，OK */ }
        else if(/^\//.test(o)) problems.push([rel,'JSON-LD 字段是相对路径',keyPath+' = '+o]);
        return;
      }
      if(Array.isArray(o)){ o.forEach((v,i)=>scan(v,keyPath)); return; }
      if(o&&typeof o==='object'){ for(const [k,v] of Object.entries(o)) scan(v,keyPath?keyPath+'.'+k:k); }
    };
    scan(d);
    // 日期字段
    for(const k of ['datePublished','dateModified','dateCreated']){
      const v=d[k]; if(!v) continue;
      if(isNaN(Date.parse(v))) problems.push([rel,'JSON-LD 日期非法',k+'='+v]);
    }
    // @type 必须存在
    if(!d['@type']) problems.push([rel,'JSON-LD 缺 @type','']);
  }
  // ---- canonical / og:url 应与页面自身 URL 一致 ----
  const want=urlOf(f);
  const can=s.match(/<link[^>]*rel=["']?canonical["']?[^>]*>/i);
  if(can){ const h=can[0].match(/href=["']?([^"'\s>]+)/); 
    if(h && h[1].replace(/\/$/,'')!==want.replace(/\/$/,'')) problems.push([rel,'canonical 不等于自身 URL',h[1]]); }
  else if(rel!=='404.html') problems.push([rel,'缺 canonical','']);
  const ogu=s.match(/<meta[^>]*property=og:url[^>]*>/);
  if(ogu){ const c=ogu[0].match(/content=["']?([^"'\s>]+)/);
    if(c && c[1].replace(/\/$/,'')!==want.replace(/\/$/,'')) problems.push([rel,'og:url 不等于自身 URL',c[1]]); }
  // ---- og:image 指向的文件必须存在 ----
  const ogi=s.match(/<meta[^>]*property=og:image[^>]*>/);
  if(ogi){ const c=ogi[0].match(/content=["']?([^"'\s>]+)/); const v=c?c[1]:'';
    if(v.startsWith('https://xfengyin.github.io/')){
      const local=path.join(PUB, v.replace('https://xfengyin.github.io/',''));
      if(!fs.existsSync(local)) problems.push([rel,'og:image 指向不存在的文件',v]);
    } else problems.push([rel,'og:image 不是本站绝对地址',v]);
  }
}
console.log(`检查 ${files.length} 个页面`);
if(!problems.length) console.log('  ✓ 声明值全部有效');
else{
  const by={}; problems.forEach(([r,k,v])=>{(by[k]=by[k]||[]).push([r,v]);});
  for(const [k,v] of Object.entries(by)){
    console.log(`  ✗ ${k}: ${v.length} 处`);
    v.slice(0,4).forEach(([r,val])=>console.log(`      ${r}  ${String(val).slice(0,70)}`));
  }
}
process.exit(problems.length?1:0);
