const p=require('/tmp/pptr/node_modules/puppeteer');
function lum(rgb){const [r,g,b]=rgb.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}
const BASE=process.argv[2];
(async()=>{
  const b=await p.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await b.newPage(); await pg.setCacheEnabled(false);
  await pg.setViewport({width:1280,height:900});
  await pg.goto(BASE+'/posts/zen-framework/',{waitUntil:'networkidle2',timeout:45000});
  const items=await pg.evaluate(()=>{
    const parse=s=>{const m=s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[+m[1],+m[2],+m[3]]:null;};
    const out=[];
    // 只测「实色背景」的元素：向上找第一个非 transparent 的背景
    const bgOf=el=>{let n=el;while(n){const m=getComputedStyle(n).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if(m&&(m[4]===undefined||+m[4]>0.9))return {c:[+m[1],+m[2],+m[3]], el:n}; n=n.parentElement;} return {c:null,el:null};};
    document.querySelectorAll('body *').forEach(el=>{
      if(el.children.length) return;
      const t=(el.textContent||'').trim(); if(!t) return;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none')return;
      const fg=parse(cs.color); if(!fg)return;
      const {c:bg,el:src}=bgOf(el);
      // 背景来自渐变/图片容器（题词区）时不测 —— 计算样式看不到渐变，会误判
      if(!bg) return;
      if(src && /signature|danmaku|toolbar/.test(String(src.className||''))) return;
      out.push({tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,22),text:t.slice(0,16),
        fg,bg,size:parseFloat(cs.fontSize),weight:cs.fontWeight});
    });
    return out;
  });
  await b.close();
  const seen=new Map();
  for(const it of items){
    const r=ratio(it.fg,it.bg);
    const large = it.size>=24 || (it.size>=18.66 && +it.weight>=700);
    const need = large?3:4.5;
    if(r<need){
      const k=it.cls+'|'+it.fg.join(',')+'|'+it.bg.join(',')+'|'+it.size;
      if(!seen.has(k)) seen.set(k,{...it,r,need});
    }
  }
  if(!seen.size) console.log('  ✓ 所有实底文本均达 AA');
  else for(const v of seen.values())
    console.log(`  ✗ ${v.r.toFixed(2)}:1 (需 ${v.need}) ${v.size}px ${v.tag}.${v.cls} fg=rgb(${v.fg}) bg=rgb(${v.bg}) "${v.text}"`);
})().catch(e=>{console.log('ERR',e.message.slice(0,200));process.exit(1)});
