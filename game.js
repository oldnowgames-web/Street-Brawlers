/* ============================================================
   STREET BRAWLERS - game.js
   Depende de: sprites.js (const SPR) e style.css
   Canvas logico 400x260 desenhado em 'LC' e ampliado 3x no
   canvas visivel (1200x780); o texto e desenhado em alta resolucao.
   Principais partes (procure por):
     TOUCH/CFG ........ configuracoes salvas no navegador (localStorage)
     pointerdown ...... mouse e toque (botoes na tela)
     MV / SP / STAT ... golpes, ults e atributos de cada lutador
     ext() / tryHit ... hitbox baseada nos pixels do sprite
     SFX / TR ......... efeitos sonoros e musicas (WebAudio)
     STG / STGA ....... mapas em camadas (parallax) e animacoes
     function step .... logica de cada lutador (estados, defesa, quebra)
     function update .. loop do jogo, menus, tutorial e pause
     function render .. desenho de telas e HUD
   ============================================================ */
const W=400,H=260,GY=192;
const C=document.getElementById('c'),V=C.getContext('2d'),LC=document.createElement('canvas');LC.width=400;LC.height=260;const X=LC.getContext('2d');X.imageSmoothingEnabled=false;const S=3;
document.fonts&&['12px "Press Start 2P"','700 12px "Chakra Petch"'].forEach(f=>document.fonts.load(f));
const AN=['Idle','Walk','Attack1','Attack2','Attack3_Kick','Jump','Hurt','KnockDown','Special','Attack4','Block','GuardBreak'];
const IMG={},NAMES=Object.keys(SPR);let loaded=0,total=0;
for(const n of NAMES){IMG[n]={};for(const a of AN){total++;const i=new Image();i.onload=()=>loaded++;i.src=SPR[n][a];IMG[n][a]=i}}
const NF=(n,a)=>Math.max(1,Math.round(IMG[n][a].width/100));
const keys={},press={},R=Math.random;
addEventListener('keydown',e=>{if(!keys[e.code])press[e.code]=1;keys[e.code]=1;if(e.code.startsWith('Arrow')||e.code=='Space')e.preventDefault()});
addEventListener('keyup',e=>{keys[e.code]=0});
const P1={l:'KeyA',r:'KeyD',u:'KeyW',a1:'KeyJ',a2:'KeyK',a3:'KeyH',sp:'KeyR',b:'KeyS'};
const P2={l:'ArrowLeft',r:'ArrowRight',u:'ArrowUp',a1:'Comma',a2:'Period',a3:'Slash',sp:'Slash'};
const readIn=k=>({l:keys[k.l],r:keys[k.r],u:press[k.u],lt:press[k.a1],hv:press[k.a2],sp:press[k.sp],b:keys[k.b]});
let TOUCH=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
let CFG={snd:1,mus:1,diff:1,dbg:0,touch:0,tut:0};
try{Object.assign(CFG,JSON.parse(localStorage.getItem('sb_cfg')||'{}'))}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('sb_cfg',JSON.stringify(CFG))}catch(e){}};
const showPad=()=>CFG.touch==1||(CFG.touch==0&&TOUCH);
const isFS=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
const toggleFS=()=>{try{if(isFS()){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}else{const el=document.documentElement;(el.requestFullscreen||el.webkitRequestFullscreen).call(el)}}catch(e){G.toast={s:'Tela cheia nao suportada',t:120}}};
const DF=()=>[.45,1,1.8][CFG.diff];
const BT=[],holds={};let MP=null;
const pt=e=>{const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
const hit=(p,b)=>p&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h;
C.addEventListener('pointerdown',e=>{e.preventDefault();if(e.pointerType=='touch')TOUCH=true;try{C.setPointerCapture(e.pointerId)}catch(_){}
 MP=pt(e);const b=BT.find(b=>hit(MP,b));if(!b)return;
 if(b.key){holds[e.pointerId]=b;if(!keys[b.key])press[b.key]=1;keys[b.key]=1}else{b.fn();beep(520,.05)}});
const rel=e=>{const b=holds[e.pointerId];if(b){keys[b.key]=0;delete holds[e.pointerId]}if(e.pointerType!='mouse')MP=null};
C.addEventListener('pointerup',rel);C.addEventListener('pointercancel',rel);
C.addEventListener('pointermove',e=>{MP=pt(e)});C.addEventListener('pointerleave',()=>{MP=null});
const SP={Capoeirista:{name:'VOADORA!',spd:5,act:[2,3],mv:[1,4],vx:3.6,dmg:24,reach:50,kb:6,knock:1},
Luchador:{name:'LARIAT!',spd:5,act:[1,4],mv:[1,4],vx:2.6,dmg:28,reach:46,kb:6,knock:1},
Kunoichi:{name:'SHURIKEN!',spd:5,proj:2,mv:[9,9],vx:0,dmg:22,act:[9,9],pj:{type:'star',vx:5.5,y:-40,r:5,kb:2.5}},
Punk:{name:'UPPERCUT!',spd:5,act:[2,3],mv:[0,3],vx:2.8,dmg:26,kb:5,knock:1},
Sumo:{name:'PISÃO!',spd:5,proj:2,mv:[9,9],vx:0,dmg:26,act:[9,9],pj:{type:'wave',vx:3.4,y:-6,r:7,kb:6,knock:1}},
Cangaceiro:{name:'CHAPÉU!',spd:5,proj:2,mv:[9,9],vx:0,dmg:20,act:[9,9],pj:{type:'hat',vx:5.2,y:-40,r:8,kb:4,knock:1}},
Monge:{name:'ONDA KI!',spd:5,proj:2,mv:[9,9],vx:0,dmg:24,act:[9,9],pj:{type:'ki',vx:4.2,y:-38,r:8,kb:6,knock:1}},
Ciborgue:{name:'FOGUETE!',spd:5,proj:2,mv:[9,9],vx:0,dmg:24,act:[9,9],pj:{type:'rocket',vx:8,y:-40,r:6,kb:6,knock:1}},
Boxeador:{name:'METRALHA!',spd:4,act:[1,4],multi:1,mv:[1,4],vx:1.1,dmg:8,kb:2.2},
KungFu:{name:'FURACÃO!',spd:5,act:[2,4],multi:1,mv:[1,4],vx:2,dmg:9,kb:2.5},
MuayThai:{name:'JOELHADA!',spd:5,act:[2,3],mv:[1,4],vx:3.4,dmg:27,kb:6,knock:1},
Samurai:{name:'CORTE LUNAR!',spd:5,proj:3,melee:1,act:[2,3],mv:[1,3],vx:2.4,dmg:24,pdmg:18,kb:6,knock:1,pj:{type:'crescent',vx:7,y:-38,r:9,kb:6,knock:1}}};
const MV={
Capoeirista:{l:{an:'Attack4',spd:3,act:[1,2],dmg:5,reach:44,kb:2},h:{an:'Attack3_Kick',spd:5,act:[2,3],dmg:12,reach:56,kb:5,knock:1}},
Luchador:{l:{an:'Attack1',spd:4,act:[2,3],dmg:6,reach:38,kb:2.2},h:{an:'Attack2',spd:6,act:[2,3],dmg:14,reach:42,kb:5,knock:1}},
Kunoichi:{l:{an:'Attack1',spd:3,act:[2,3],dmg:5,reach:36,kb:2},h:{an:'Attack3_Kick',spd:4,act:[2,3],dmg:10,reach:54,kb:4,knock:1}},
Punk:{l:{an:'Attack4',spd:4,act:[2,3],dmg:6,kb:2.4},h:{an:'Attack2',spd:5,act:[2,3],dmg:13,kb:4.5,knock:1}},
Sumo:{l:{an:'Attack2',spd:6,act:[2,3],dmg:9,kb:3},h:{an:'Attack3_Kick',spd:8,act:[2,3],dmg:19,kb:7,knock:1}},
Cangaceiro:{l:{an:'Attack1',spd:4,act:[2,3],dmg:6,kb:2.2},h:{an:'Attack2',spd:6,act:[2,3],dmg:13,kb:5,knock:1}},
Monge:{l:{an:'Attack4',spd:3,act:[1,2],dmg:4,kb:1.8},h:{an:'Attack3_Kick',spd:5,act:[2,3],dmg:11,kb:4.5,knock:1}},
Ciborgue:{l:{an:'Attack2',spd:4,act:[2,3],dmg:7,kb:2.6},h:{an:'Attack1',spd:7,act:[2,3],dmg:15,kb:5.5,knock:1}},
Boxeador:{l:{an:'Attack1',spd:3,act:[2,3],dmg:5,kb:2},h:{an:'Attack2',spd:5,act:[2,3],dmg:13,kb:5,knock:1}},
KungFu:{l:{an:'Attack4',spd:3,act:[1,2],dmg:4,kb:1.8},h:{an:'Attack1',spd:4,act:[2,3],dmg:9,kb:4,knock:1}},
MuayThai:{l:{an:'Attack4',spd:4,act:[2,3],dmg:7,kb:2.6},h:{an:'Attack3_Kick',spd:6,act:[2,3],dmg:15,kb:6,knock:1}},
Samurai:{l:{an:'Attack1',spd:4,act:[2,3],dmg:7,kb:2.4},h:{an:'Attack2',spd:7,act:[3,4],dmg:17,kb:6,knock:1}}};
const DN=n=>({KungFu:'Kung Fu',MuayThai:'Muay Thai'}[n]||n);
const STAT={Capoeirista:{hp:100,sp:1.8},Luchador:{hp:115,sp:1.5},Kunoichi:{hp:90,sp:2.1},Punk:{hp:100,sp:1.7},Sumo:{hp:135,sp:1.2},Cangaceiro:{hp:100,sp:1.7},Monge:{hp:105,sp:1.85},Ciborgue:{hp:115,sp:1.6},Boxeador:{hp:110,sp:1.7},KungFu:{hp:95,sp:2.0},MuayThai:{hp:115,sp:1.65},Samurai:{hp:95,sp:1.6}};
const HW={Sumo:16,Luchador:11};
const GM={Sumo:80,Luchador:70,KungFu:50,Kunoichi:50,Samurai:55},GMX=n=>GM[n]||60;
const EXT={};
function ext(n,an,i){const key=n+an;let E=EXT[key];if(!E){const im=IMG[n][an],cv=document.createElement('canvas');cv.width=im.width;cv.height=100;const c=cv.getContext('2d');c.drawImage(im,0,0);
 const d=c.getImageData(0,0,im.width,100).data,w=im.width;E=[];
 for(let f=0;f<w/100;f++){let mx=-1;for(let x=99;x>=0&&mx<0;x--)for(let y=0;y<100;y++)if(d[(y*w+f*100+x)*4+3]>40){mx=x;break}
  let sy=0,c2=0;if(mx>=0)for(let x=mx;x>mx-5&&x>=0;x--)for(let y=0;y<100;y++)if(d[(y*w+f*100+x)*4+3]>40){sy+=y;c2++}
  E.push({fx:mx-46,fy:c2?sy/c2:60})}EXT[key]=E}return E[Math.min(i,E.length-1)]}
let projs=[];
const ATK={a1:{an:'Attack1',spd:4,act:[2,3],dmg:6,reach:38,kb:2.2},a2:{an:'Attack2',spd:5,act:[2,3],dmg:8,reach:40,kb:3},a3:{an:'Attack3_Kick',spd:5,act:[2,3],dmg:11,reach:54,kb:5,knock:1}};
let AC,MG,SG,NB,GEST=0,MT=null,MI=0,MN=0,MTM=0;
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();MG=AC.createGain();MG.gain.value=.5;MG.connect(AC.destination);SG=AC.createGain();SG.gain.value=.9;SG.connect(AC.destination)}catch(e){AC=null}}return AC}
const noise=()=>{if(!NB){const n=AC.sampleRate*.5|0;NB=AC.createBuffer(1,n,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1}return NB};
function tone(ty,f0,f1,dur,v,dl,out){const t=AC.currentTime+(dl||0),o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(out||SG);o.start(t);o.stop(t+dur+.02)}
function nz(dur,v,fq,dl,q,ty,out){const t=AC.currentTime+(dl||0),s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noise();fl.type=ty||'bandpass';fl.frequency.value=fq;fl.Q.value=q||1;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(fl);fl.connect(g);g.connect(out||SG);s.start(t);s.stop(t+dur+.02)}
const SFX={
 punch:()=>{nz(.08,.5,1800,0,.8);tone('square',220,70,.09,.25)},
 punchh:()=>{nz(.14,.7,900,0,.7);tone('square',160,40,.16,.35);tone('sawtooth',90,40,.14,.2)},
 kick:()=>{nz(.1,.5,1200,0,.6);tone('triangle',180,60,.12,.45)},
 kickh:()=>{nz(.18,.7,700,0,.6);tone('triangle',140,30,.2,.6);tone('square',100,40,.12,.2)},
 ultmelee:()=>{nz(.22,.8,600,0,.5);tone('sawtooth',200,30,.3,.45);tone('square',400,80,.2,.2)},
 whoosh:()=>{nz(.12,.18,2400,0,2)},
 proj:()=>{tone('square',900,200,.25,.2);tone('sawtooth',1400,400,.2,.12)},
 projhit:()=>{nz(.18,.6,1500,0,.6);tone('square',500,60,.2,.35)},
 block:()=>{tone('square',900,500,.06,.25);tone('triangle',1500,900,.08,.2);nz(.05,.3,3000,0,2)},
 ko:()=>{tone('sawtooth',400,40,.7,.45);tone('square',200,30,.8,.3,.05);nz(.5,.5,300,0,.4)},
 ult:()=>{tone('square',200,1200,.35,.25);tone('triangle',400,1600,.35,.2)},
 jump:()=>{tone('square',300,700,.1,.1)},
 ui:()=>{tone('square',700,900,.05,.15)},
 gbreak:()=>{nz(.35,.8,3500,0,.5);tone('square',1200,100,.4,.35);tone('sawtooth',600,50,.5,.3,.05);nz(.2,.6,800,.1,.4)}};
function sfx(n){try{if(!CFG.snd||!GEST||!ac())return;if(SFX[n])SFX[n]()}catch(e){}}
function beep(){sfx('ui')}
const TR=[
{bpm:132,root:57,sc:[0,2,3,5,7,8,10],seed:11,rest:.2,lw:'square',prog:[0,5,3,4],bass:[0,0,7,0,0,0,7,10],dr:3},
{bpm:92,root:62,sc:[0,3,5,7,10],seed:23,rest:.45,lw:'triangle',prog:[0,3,0,4],bass:[0,0,0,7,0,0,7,0],dr:1},
{bpm:116,root:60,sc:[0,2,4,7,9],seed:37,rest:.25,lw:'square',prog:[0,3,4,0],bass:[0,0,7,0,5,0,7,0],dr:2},
{bpm:140,root:52,sc:[0,2,3,5,7,8,10],seed:41,rest:.15,lw:'square',prog:[0,0,5,6],bass:[0,0,0,0,7,7,5,5],dr:3},
{bpm:84,root:64,sc:[0,2,4,6,7,9,11],seed:53,rest:.5,lw:'triangle',prog:[0,4,5,3],bass:[0,0,0,0,7,0,0,0],dr:1},
{bpm:152,root:50,sc:[0,1,3,5,7,8,10],seed:67,rest:.15,lw:'square',prog:[0,1,0,6],bass:[0,0,1,0,0,0,1,0],dr:3},
{bpm:108,root:60,sc:[0,2,4,5,7,9,11],seed:79,rest:.2,lw:'square',prog:[0,4,5,3],bass:[0,0,7,0,5,0,7,0],dr:2}];
TR.forEach(t=>{let q=t.seed;const r=()=>(q=q*16807%2147483647)/2147483647,n=t.sc.length;let d=n;t.m=[];for(let i=0;i<8;i++){if(r()<t.rest)t.m.push(null);else{d=Math.max(0,Math.min(n*2-1,d+((r()*5)|0)-2));t.m.push(d)}}});
const mf=m=>440*Math.pow(2,(m-69)/12),nd=(t,d)=>t.sc[d%t.sc.length]+12*((d/t.sc.length)|0);
function note(ty,f,dur,at,v){const o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(v,at);g.gain.setValueAtTime(v,at+dur*.6);g.gain.linearRampToValueAtTime(0,at+dur);o.connect(g);g.connect(MG);o.start(at);o.stop(at+dur+.02)}
function dk(at,fq,dur,v){const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noise();fl.type='highpass';fl.frequency.value=fq;g.gain.setValueAtTime(v,at);g.gain.exponentialRampToValueAtTime(.001,at+dur);s.connect(fl);fl.connect(g);g.connect(MG);s.start(at);s.stop(at+dur+.02)}
function kick(at){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,at);o.frequency.exponentialRampToValueAtTime(40,at+.12);g.gain.setValueAtTime(.35,at);g.gain.exponentialRampToValueAtTime(.001,at+.14);o.connect(g);g.connect(MG);o.start(at);o.stop(at+.16)}
function playStep(t,i,at){const bar=((i/8)|0)%4,s=i%8,ch=t.sc[t.prog[bar]%t.sc.length],sd=60/t.bpm/2;
 if(s%2==0)note('triangle',mf(t.root-12+ch+t.bass[s]),sd*1.8,at,.2);
 let m=t.m[s];if(bar%2&&m!=null&&(s==3||s==6))m=m+2;
 if(m!=null)note(t.lw,mf(t.root+12+ch+nd(t,m)),sd*.9,at,.06);
 if(s%4==0)kick(at);if(t.dr>1&&s%4==2)dk(at,1800,.1,.12);if(t.dr>0)dk(at,7000,.03,s%2?.03:.06)}
function musicTick(){try{if(MT==null||!CFG.mus||!AC)return;if(MN<AC.currentTime-.3)MN=AC.currentTime+.05;const t=TR[MT],sd=60/t.bpm/2;while(MN<AC.currentTime+.3){playStep(t,MI,MN);MN+=sd;MI++}}catch(e){}}
function musicStart(i){if(!GEST||!CFG.mus||!ac())return;if(MT!==i){MT=i;MI=0;MN=AC.currentTime+.1}if(!MTM)MTM=setInterval(musicTick,40)}
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{GEST=1;try{if(AC&&AC.state=='suspended'&&!G.paused)AC.resume()}catch(e){}}));
addEventListener('blur',()=>{if(G.s=='fight'&&!G.paused)setPause(true)});
// cenário
const BG=document.createElement('canvas');BG.width=W;BG.height=H;
(()=>{const g=BG.getContext('2d');const gr=g.createLinearGradient(0,0,0,GY);gr.addColorStop(0,'#220a66');gr.addColorStop(.55,'#d0238a');gr.addColorStop(1,'#ffa23a');g.fillStyle=gr;g.fillRect(0,0,W,H);
g.fillStyle='#ffe66b';g.beginPath();g.arc(300,62,24,0,7);g.fill();g.fillStyle='#ff6a3a';for(let k=0;k<5;k++)g.fillRect(274,66+k*5,52,1+k);
let s=7;const rn=()=>(s=s*16807%2147483647)/2147483647;
for(const[c,mh,win]of[['#3a1a7a',100,0],['#26104f',70,1]]){let x=0;while(x<W){const w=20+rn()*30,h=mh*(.4+rn()*.6);g.fillStyle=c;g.fillRect(x,GY-h,w,h);if(win)for(let y=GY-h+6;y<GY-6;y+=9)for(let xx=x+4;xx<x+w-4;xx+=8)if(rn()<.35){g.fillStyle='#ffd27a';g.fillRect(xx,y,3,4)}x+=w+2}}
g.fillStyle='#3a2a44';g.fillRect(0,GY-6,W,H);for(let i=0;i<6;i++){g.fillStyle=i%2?'#46344f':'#3a2a44';g.fillRect(0,GY-6+i*9,W,9)}g.fillStyle='#e8805a';g.fillRect(0,GY-6,W,1)})();
(()=>{const g=BG.getContext('2d');let s=11;const rn=()=>(s=s*16807%2147483647)/2147483647;
for(let i=0;i<60;i++){g.fillStyle='rgba(255,255,255,'+(.3+rn()*.6)+')';g.fillRect(rn()*W,rn()*80,1,1)}
g.fillStyle='#ff2e9a';g.fillRect(40,118,46,10);g.fillStyle='#fff';g.font='bold 8px monospace';g.fillText('RAMEN',48,126);
g.fillStyle='#22e0ff';g.fillRect(330,100,40,10);g.fillStyle='#102';g.fillText('BAR',342,108);
g.strokeStyle='rgba(255,255,255,.07)';for(let i=-8;i<=8;i++){g.beginPath();g.moveTo(200+i*14,GY+2);g.lineTo(200+i*60,H);g.stroke()}
const v=g.createRadialGradient(200,130,80,200,130,260);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=v;g.fillRect(0,0,W,H)})();
const STG=[],STGL=[];
const mkStage=fn=>{const cs=[0,1,2,3].map(()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c}),cx=cs.map(c=>c.getContext('2d'));let cur=0;
 const g=new Proxy({},{get:(_,p)=>p==='L'?(n=>{cur=n}):(typeof cx[cur][p]=='function'?cx[cur][p].bind(cx[cur]):cx[cur][p]),set:(_,p,v)=>{cx[cur][p]=v;return true}});
 try{fn(g)}catch(e){console.error('stage',e)}
 const f=document.createElement('canvas');f.width=W;f.height=H;const fc=f.getContext('2d');cs.forEach(c=>fc.drawImage(c,0,0));STGL.push(cs);return f};
const lg=(g,y0,y1,st)=>{const r=g.createLinearGradient(0,y0,0,y1);st.forEach((s,i)=>r.addColorStop(i/(st.length-1),s));return r};
const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
const circ=(g,c,x,y,r)=>{g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill()};
const poly=(g,c,p)=>{g.fillStyle=c;g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill()};
const rngf=s=>()=>(s=s*16807%2147483647)/2147483647;
const glow=(g,x,y,r,c,a)=>{const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+c+','+a+')');q.addColorStop(1,'rgba('+c+',0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)};
const vign=(g,a)=>{const v=g.createRadialGradient(200,130,90,200,130,270);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,'+a+')');g.fillStyle=v;g.fillRect(0,0,W,H)};
const PART={};const part=(k,n,mk)=>PART[k]||(PART[k]=Array.from({length:n},mk));
const SNAME=['Rua Neon','Dojo Sakura','Praia do Rio','Arena Mundial','Templo Gelado','Vulcão'];
const FT=GY-6;
function drawStage(i){const L=STGL[i],cam=(F[0].x+F[1].x)/2-200;
 X.drawImage(L[0],-12-cam*.05,-3,W+24,H+6);X.drawImage(L[1],-20-cam*.1,0,W+40,H);X.drawImage(L[2],-30-cam*.17,0,W+60,H)}
function drawFront(){X.drawImage(STGL[G.stI][3],0,0)}
// ===== 0 · RUA NEON (chuva) =====
STG.push(mkStage(g=>{const r=rngf(101);
 g.fillStyle=lg(g,0,FT,['#07041c','#26105a','#8a1f7a','#ff5a8a']);g.fillRect(0,0,W,H);
 for(let i=0;i<46;i++)rect(g,'rgba(255,255,255,'+(.2+r()*.5)+')',r()*W,r()*60,1,1);
 circ(g,'rgba(255,200,230,.12)',320,46,34);circ(g,'rgba(255,220,240,.35)',320,46,18);
 const sky=(col,hmin,hmax,seed)=>{const q=rngf(seed);let x=-5;while(x<W){const w=14+q()*26,h=hmin+q()*(hmax-hmin);rect(g,col,x,FT-h,w,h);if(q()<.25){rect(g,col,x+w/2-1,FT-h-12,2,12);rect(g,'#ff3a3a',x+w/2-1,FT-h-12,2,2)}
  for(let y=FT-h+4;y<FT-6;y+=6)for(let xx=x+3;xx<x+w-3;xx+=5)if(q()<.3)rect(g,q()<.5?'#ffd27a':'#7af0ff',xx,y,2,3);x+=w+1}};
 sky('#2c1556',60,112,3);glow(g,200,FT-10,160,'255,70,150',.4);sky('#1a0c3a',84,150,5);
 g.L(1);
 rect(g,'#10081f',0,100,W,7);rect(g,'#3a2a5a',0,98,W,2);for(let x=14;x<W;x+=58){rect(g,'#10081f',x,107,6,FT-107);rect(g,'#2a1a44',x+1,107,2,FT-107)}
 for(let x=0;x<W;x+=8)rect(g,'rgba(255,255,255,.08)',x,100,4,1);
 const bld=(x,w,top)=>{rect(g,'#0e0722',x,top,w,FT-top);rect(g,'#1c0f3a',x,top,3,FT-top);for(let y=top+6;y<FT-8;y+=8)for(let xx=x+8;xx<x+w-6;xx+=9)if(r()<.45){rect(g,r()<.5?'#ffcf70':r()<.5?'#6af0ff':'#ff7ad0',xx,y,4,4)}};
 bld(-4,94,34);bld(306,98,52);
 glow(g,40,70,50,'255,46,154',.5);rect(g,'#2a0a3a',6,58,68,26);g.strokeStyle='#ff2e9a';g.lineWidth=2;g.strokeRect(7,59,66,24);g.font='bold 14px monospace';g.fillStyle='#ffd0ee';g.fillText('RAMEN',11,77);
 glow(g,356,92,44,'34,224,255',.5);rect(g,'#062a3a',324,80,64,22);g.strokeStyle='#22e0ff';g.strokeRect(325,81,62,20);g.font='bold 13px monospace';g.fillStyle='#d0fbff';g.fillText('KARAOKE',329,96);
 rect(g,'#ff2e9a',84,50,3,44);rect(g,'#22e0ff',296,60,3,40);glow(g,85,70,26,'255,46,154',.35);glow(g,297,80,26,'34,224,255',.35);
 g.L(2);
 g.fillStyle=lg(g,FT,H,['#2a2540','#1c1830','#0e0b1c']);g.fillRect(0,FT,W,H);
 rect(g,'#4a4466',0,FT,W,3);rect(g,'#6a6490',0,FT,W,1);
 for(let x=0;x<W;x+=46)rect(g,'rgba(255,230,160,.5)',x+10,FT+30,26,3);
 for(let x=0;x<W;x+=22)rect(g,'rgba(0,0,0,.25)',x,FT+4,1,10);
 [[70,FT+26,'255,46,154'],[200,FT+36,'34,224,255'],[330,FT+22,'255,200,90']].forEach(([x,y,c])=>{g.fillStyle='rgba(120,130,190,.28)';g.beginPath();g.ellipse(x,y,38,6,0,0,7);g.fill();
  for(let k=-30;k<=30;k+=6)rect(g,'rgba('+c+',.28)',x+k,y-3,3,6);g.strokeStyle='rgba(255,255,255,.2)';g.beginPath();g.ellipse(x,y,38,6,0,0,7);g.stroke()});
 const lamp=(x)=>{rect(g,'#0a0618',x,60,3,FT-56);rect(g,'#0a0618',x-8,60,12,3);glow(g,x-6,66,34,'255,200,120',.55);circ(g,'#fff2c0',x-6,64,2.5)};lamp(24);lamp(386);
 rect(g,'#10081f',356,FT-34,26,34);rect(g,'#22e0ff',359,FT-30,20,18);for(let k=0;k<4;k++)rect(g,['#ff4a6a','#ffd34d','#58d68d','#fff'][k],360+k*5,FT-28,3,14);glow(g,369,FT-20,30,'34,224,255',.3);
 g.L(3);const f=g.createLinearGradient(0,130,0,H);f.addColorStop(0,'rgba(140,60,200,0)');f.addColorStop(1,'rgba(140,60,200,.22)');g.fillStyle=f;g.fillRect(0,130,W,H);vign(g,.5)}));
// ===== 1 · DOJO SAKURA =====
STG.push(mkStage(g=>{const r=rngf(5);
 g.fillStyle=lg(g,0,GY,['#1d1250','#7a2c8c','#e0568a','#ffb48a']);g.fillRect(0,0,W,H);
 for(let i=0;i<50;i++)rect(g,'rgba(255,255,255,'+(.3+r()*.5)+')',r()*W,r()*70,1,1);
 circ(g,'rgba(255,240,220,.14)',300,52,42);circ(g,'rgba(255,240,220,.25)',300,52,32);circ(g,'#fff4dc',300,52,25);circ(g,'#ecd5b8',294,46,5);circ(g,'#ecd5b8',307,58,4);
 poly(g,'#5b3a8c',[[0,180],[0,124],[60,104],[130,134],[210,112],[290,138],[400,108],[400,180]]);
 poly(g,'#4a2f7a',[[30,180],[150,66],[270,180]]);poly(g,'#ffe8f0',[[150,66],[131,98],[141,92],[150,104],[160,92],[170,98]]);
 g.fillStyle=lg(g,110,180,['rgba(255,170,160,0)','rgba(255,170,160,.5)']);g.fillRect(0,110,W,70);
 g.L(1);
 for(let x=2;x<W;x+=11+r()*8){const h=70+r()*50,w=3;rect(g,'#2a3a5a',x,FT-h,w,h);rect(g,'#3f5a7a',x,FT-h,1,h);for(let y=FT-h+8;y<FT;y+=14)rect(g,'#1a2a46',x-1,y,w+2,1);if(r()<.5){poly(g,'#2e4a68',[[x+3,FT-h+20],[x+14,FT-h+14],[x+3,FT-h+24]])}}
 g.fillStyle='rgba(255,170,190,.25)';g.fillRect(0,100,W,FT-100);
 const tree=(x,b,s)=>{g.strokeStyle='#3a2018';g.lineCap='round';g.lineWidth=7*s;g.beginPath();g.moveTo(x,b);g.quadraticCurveTo(x+10*s,b-40*s,x+4*s,b-78*s);g.stroke();
  g.lineWidth=3.5*s;g.beginPath();g.moveTo(x+6*s,b-44*s);g.lineTo(x+32*s,b-72*s);g.moveTo(x+5*s,b-52*s);g.lineTo(x-26*s,b-80*s);g.stroke();
  for(let k=0;k<24;k++){const a=r()*6.28,d=r()*30*s;circ(g,['#ff8fbd','#ffa6c9','#ff75ab','#ffc2dc'][k%4],x+6*s+Math.cos(a)*d*1.3,b-84*s+Math.sin(a)*d*.75,(9+r()*8)*s)}
  for(let k=0;k<34;k++){const a=r()*6.28,d=r()*38*s;rect(g,'#ffe4ef',x+6*s+Math.cos(a)*d*1.3,b-84*s+Math.sin(a)*d*.75,2,2)}};
 tree(92,FT-2,.55);tree(338,FT-2,.5);
 rect(g,'#3a2342',150,134,150,FT-134);rect(g,'#e6cd9c',154,138,142,FT-138);
 for(let x=154;x<296;x+=24){rect(g,'#f8ecd0',x+3,142,18,FT-148);rect(g,'rgba(255,214,150,.5)',x+3,142,18,FT-148);for(let y=148;y<FT-6;y+=12)rect(g,'#b88a58',x+3,y,18,1);rect(g,'#b88a58',x+12,142,1,FT-148)}
 glow(g,225,FT-24,90,'255,200,120',.3);
 for(let x=150;x<=300;x+=24)rect(g,'#6a3a22',x,136,4,FT-136);rect(g,'#6a3a22',150,134,150,5);
 poly(g,'#241628',[[116,138],[225,86],[334,138],[318,143],[225,98],[132,143]]);poly(g,'#3a2342',[[132,143],[225,98],[318,143],[310,148],[225,106],[140,148]]);
 g.strokeStyle='#8a5aa0';g.lineWidth=1;g.beginPath();g.moveTo(132,143);g.lineTo(225,98);g.lineTo(318,143);g.stroke();
 for(let i=0;i<12;i++)rect(g,'rgba(0,0,0,.25)',150+i*12,134,1,8);
 [[128,74],[322,74]].forEach(([x,y])=>{rect(g,'#2a1a2e',x,30,1,y-36);rect(g,'#2a1a2e',x-6,y-8,12,3);g.fillStyle='#e02840';g.beginPath();g.ellipse(x,y+4,9,12,0,0,7);g.fill();for(let k=-6;k<=6;k+=4)rect(g,'rgba(120,10,30,.5)',x+k,y-6,1,20);rect(g,'#2a1a2e',x-5,y+14,10,3);rect(g,'#ffd070',x,y+17,1,8)});
 g.L(2);
 g.fillStyle=lg(g,FT,H,['#b87a44','#9a5a32','#6a3a22']);g.fillRect(0,FT,W,H);
 for(let y=FT,k=0;y<H;y+=9,k++){rect(g,k%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)',0,y,W,9);rect(g,'rgba(0,0,0,.28)',0,y,W,1);for(let x=(k*37)%80;x<W;x+=80+r()*40)rect(g,'rgba(0,0,0,.25)',x,y,1,9)}
 rect(g,'#e8a870',0,FT,W,1);
 g.fillStyle='rgba(235,220,165,.4)';g.beginPath();g.ellipse(200,GY+30,150,30,0,0,7);g.fill();g.strokeStyle='rgba(90,40,20,.55)';g.lineWidth=2;g.stroke();
 const toro=(x,b)=>{rect(g,'#7a8090',x-5,b-10,10,10);rect(g,'#9aa0b0',x-3,b-26,6,16);rect(g,'#b0b6c4',x-9,b-36,18,10);rect(g,'#ffcf70',x-5,b-33,10,5);poly(g,'#8a90a0',[[x-14,b-36],[x,b-48],[x+14,b-36]]);glow(g,x,b-30,26,'255,200,100',.35)};toro(60,FT+40);toro(348,FT+42);
 tree(26,GY+16,1.4);tree(378,GY+16,1.25);
 g.L(3);for(let i=0;i<4;i++)poly(g,'rgba(255,230,190,.07)',[[120+i*70,0],[150+i*70,0],[60+i*70,FT],[20+i*70,FT]]);vign(g,.42)}));
// ===== 2 · PRAIA DO RIO =====
STG.push(mkStage(g=>{const r=rngf(9);
 g.fillStyle=lg(g,0,142,['#1d8cf0','#6fd0ff','#ffe9a0','#ffb26a']);g.fillRect(0,0,W,H);
 circ(g,'rgba(255,240,170,.22)',272,128,46);circ(g,'rgba(255,240,170,.45)',272,128,35);circ(g,'#fffbd0',272,128,26);
 g.fillStyle='#2b6a5e';g.beginPath();g.ellipse(100,144,36,62,0,Math.PI,0);g.fill();g.fillStyle='#337a68';g.beginPath();g.ellipse(160,144,26,38,0,Math.PI,0);g.fill();
 g.fillStyle='#1f5a50';g.beginPath();g.ellipse(34,144,40,30,0,Math.PI,0);g.fill();g.fillStyle='rgba(255,200,140,.3)';g.fillRect(0,100,210,44);
 rect(g,'#e8e8f0',99,80,2,12);rect(g,'#e8e8f0',95,83,10,2);
 g.strokeStyle='rgba(30,40,50,.8)';g.lineWidth=1;g.beginPath();g.moveTo(104,84);g.lineTo(158,106);g.stroke();rect(g,'#e83a3a',127,93,6,5);
 g.L(1);
 const cloud=(x,y,s)=>{for(let k=0;k<6;k++)circ(g,'rgba(255,255,255,.92)',x+k*9*s,y+Math.sin(k*1.7)*4*s,(9+k%3*3)*s);rect(g,'rgba(255,190,150,.55)',x-8*s,y+8*s,60*s,3)};
 cloud(24,40,1);cloud(190,28,.8);cloud(318,60,1.1);cloud(110,78,.6);
 g.fillStyle=lg(g,142,180,['#1a86dc','#22a8e6','#6fdcf0']);g.fillRect(0,142,W,38);
 for(let i=0;i<70;i++)rect(g,'rgba(255,255,255,'+(.15+r()*.3)+')',r()*W,144+r()*32,3+r()*8,1);
 for(let y=144;y<178;y+=3)rect(g,'rgba(255,230,150,'+(.3-(y-144)*.007)+')',250+Math.sin(y)*8,y,46-(y-144)*.9,1);
 const boat=(x,y,s)=>{poly(g,'#fff',[[x,y-22*s],[x,y-2*s],[x+14*s,y-2*s]]);poly(g,'#ff6a6a',[[x-2,y-18*s],[x-2,y-2*s],[x-12*s,y-2*s]]);rect(g,'#3a2a2a',x-12*s,y-2*s,26*s,3*s)};boat(220,164,1);boat(330,158,.7);
 g.L(2);
 g.fillStyle=lg(g,176,H,['#f6d98e','#e8c070','#c89a52']);g.fillRect(0,176,W,H);
 rect(g,'#bfe9f0',0,176,W,2);rect(g,'rgba(255,255,255,.95)',0,178,W,1);rect(g,'rgba(120,90,50,.28)',0,179,W,6);
 for(let i=0;i<220;i++)rect(g,r()<.5?'rgba(120,80,40,.35)':'rgba(255,255,255,.45)',r()*W,184+r()*76,1,1);
 for(let i=0;i<7;i++){const x=40+i*52,y=GY+30+r()*26;g.fillStyle='rgba(120,80,40,.22)';g.beginPath();g.ellipse(x,y,3,1.5,0,0,7);g.fill()}
 // rede de vôlei
 rect(g,'#6a4a2a',150,FT-34,3,36);rect(g,'#6a4a2a',260,FT-34,3,36);for(let y=0;y<14;y+=3)rect(g,'rgba(255,255,255,.7)',153,FT-34+y,107,1);for(let x=153;x<260;x+=4)rect(g,'rgba(255,255,255,.5)',x,FT-34,1,14);rect(g,'#fff',153,FT-35,107,2);
 // quiosque
 rect(g,'#7a4a2a',300,FT-30,40,30);rect(g,'#c8a060',303,FT-26,34,14);poly(g,'#d8b050',[[294,FT-30],[320,FT-46],[346,FT-30]]);for(let k=0;k<7;k++)rect(g,'#b88a38',296+k*7,FT-30,2,5);rect(g,'#e83a3a',306,FT-22,8,3);rect(g,'#58d68d',318,FT-22,8,3);
 g.save();g.translate(84,FT+2);g.rotate(-.2);g.fillStyle='#14081f';g.beginPath();g.ellipse(0,-22,8,26,0,0,7);g.fill();g.fillStyle='#ffdd33';g.beginPath();g.ellipse(0,-22,6.5,24.5,0,0,7);g.fill();rect(g,'#ff4a8a',-1,-44,2,44);g.restore();
 g.save();g.translate(104,FT+6);g.rotate(.1);g.fillStyle='#14081f';g.beginPath();g.ellipse(0,-20,7,23,0,0,7);g.fill();g.fillStyle='#3aa0f0';g.beginPath();g.ellipse(0,-20,5.5,21.5,0,0,7);g.fill();rect(g,'#fff',-1,-40,2,40);g.restore();
 rect(g,'#d8d8d8',356,FT-40,2,42);g.fillStyle='#14081f';g.beginPath();g.ellipse(357,FT-40,28,14,0,Math.PI,0);g.fill();g.fillStyle='#e83a3a';g.beginPath();g.ellipse(357,FT-40,26,12,0,Math.PI,0);g.fill();
 for(let k=-18;k<=18;k+=12){g.fillStyle='#fff';g.beginPath();g.moveTo(357+k,FT-40);g.lineTo(357+k+6,FT-40);g.lineTo(357+k*.3+3,FT-52);g.closePath();g.fill()}
 rect(g,'#e83a3a',220,FT+30,40,16);rect(g,'#fff',224,FT+30,6,16);rect(g,'#fff',240,FT+30,6,16);circ(g,'#ff4a6a',300,FT+46,6);circ(g,'#fff',300,FT+46,2);
 const palm=(x,b,h,lean)=>{for(let i=0;i<h;i+=3){const t=i/h,px=x+lean*t*t*40;rect(g,i%6?'#8a5a2a':'#6e4420',px-3.5+t,b-i,7-t*2,3)}
  const tx=x+lean*40,ty=b-h;g.lineCap='round';for(let k=0;k<7;k++){const a=-2.6+k*.72,l=34+(k%2)*8;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a)*l*.6,ty+Math.sin(a)*l*.6-14,tx+Math.cos(a)*l,ty+Math.sin(a)*l+10);g.strokeStyle='#14562a';g.lineWidth=5;g.stroke();g.strokeStyle='#3bb056';g.lineWidth=2;g.stroke()}
  circ(g,'#6a3c1a',tx-2,ty+4,3);circ(g,'#6a3c1a',tx+3,ty+5,3)};
 palm(38,GY+30,112,.6);palm(388,GY+34,98,-.5);
 g.L(3);glow(g,272,128,200,'255,210,120',.18);vign(g,.3)}));
// ===== 3 · ARENA MUNDIAL =====
STG.push(mkStage(g=>{const r=rngf(13);
 g.fillStyle=lg(g,0,GY,['#07061a','#1a1048','#2a1a6a']);g.fillRect(0,0,W,H);
 for(let i=0;i<16;i++){rect(g,'#10102a',i*26,0,3,40);}rect(g,'#14143a',0,0,W,6);for(let i=0;i<10;i++)rect(g,'#10102a',0,8+i*3,W,1);
 g.L(1);
 for(let row=0;row<9;row++){const y=44+row*12;rect(g,row%2?'#1a1236':'#20163e',0,y,W,12);for(let x=(row*5)%9;x<W;x+=9){const c=['#e8403a','#f5c82e','#3aa0f0','#f08ac8','#58d68d','#f2f2f2','#9a6af0'][(r()*7)|0];circ(g,c,x+3,y+3,2.6);rect(g,c,x+1,y+6,5,5);rect(g,'rgba(0,0,0,.25)',x+1,y+9,5,2)}rect(g,'#0a0820',0,y+11,W,1)}
 rect(g,'#0a0820',148,4,104,40);rect(g,'#c8283a',152,8,47,32);rect(g,'#2858d8',201,8,47,32);poly(g,'#fff',[[196,8],[204,8],[204,40],[196,40]]);circ(g,'#ffd34d',176,24,6);circ(g,'#ffd34d',224,24,6);
 [[40,'#e8403a'],[100,'#f5c82e'],[300,'#3aa0f0'],[360,'#58d68d']].forEach(([x,c])=>{rect(g,'#0a0820',x-11,0,22,3);poly(g,c,[[x-9,3],[x+9,3],[x+9,38],[x,31],[x-9,38]]);circ(g,'rgba(255,255,255,.9)',x,15,4)});
 for(let i=0;i<6;i++){glow(g,40+i*64,5,18,'255,246,192',.5);circ(g,'#fff6c0',40+i*64,5,3)}
 [[132,'#e8403a'],[152,'#f2f2f2'],[172,'#3a78f0']].forEach(([y,c])=>{g.lineCap='round';g.strokeStyle='#08081a';g.lineWidth=4;g.beginPath();g.moveTo(14,y);g.quadraticCurveTo(200,y+8,386,y);g.stroke();g.strokeStyle=c;g.lineWidth=2;g.stroke()});
 [14,386].forEach(x=>{rect(g,'#10101c',x-4,112,8,FT-108);rect(g,'#2a2a44',x-3,112,3,FT-112);[128,150,170].forEach(y=>rect(g,'#e8403a',x-5,y,10,9))});
 g.L(2);
 g.fillStyle=lg(g,FT,H,['#2f56e0','#2342b8','#18308a']);g.fillRect(0,FT,W,H);
 for(let y=FT,k=0;y<H;y+=11,k++)rect(g,k%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)',0,y,W,11);
 rect(g,'#f2f2f2',0,FT,W,2);rect(g,'#e8403a',0,FT+2,W,2);
 g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.beginPath();g.ellipse(200,GY+34,86,24,0,0,7);g.stroke();g.beginPath();g.ellipse(200,GY+34,58,15,0,0,7);g.stroke();
 g.font='bold 12px monospace';g.fillStyle='rgba(255,255,255,.55)';g.textAlign='center';g.fillText('BRAWLERS',200,GY+38);g.textAlign='left';
 g.L(3);glow(g,200,GY+10,170,'255,246,200',.3);vign(g,.45)}));
// ===== 4 · TEMPLO GELADO =====
STG.push(mkStage(g=>{const r=rngf(21);
 g.fillStyle=lg(g,0,GY,['#081638','#1f3f90','#6fa8e0','#cfe8ff']);g.fillRect(0,0,W,H);
 for(let i=0;i<70;i++)rect(g,'rgba(255,255,255,'+(.3+r()*.6)+')',r()*W,r()*100,1,1);
 circ(g,'rgba(220,235,255,.2)',62,50,26);circ(g,'#f0f6ff',62,50,16);circ(g,'#c8d8f0',57,46,4);
 poly(g,'#7d9fd0',[[0,GY],[0,110],[50,80],[110,120],[170,70],[240,125],[310,85],[400,118],[400,GY]]);
 [[[50,80],[38,98],[48,94],[56,102],[62,94],[66,98]],[[170,70],[156,92],[166,88],[172,98],[180,88],[186,92]],[[310,85],[298,104],[306,100],[312,108],[320,100],[324,104]]].forEach(p=>poly(g,'#f2f8ff',p));
 poly(g,'#a8c4ea',[[0,GY],[0,140],[80,120],[160,145],[260,125],[340,148],[400,128],[400,GY]]);
 g.fillStyle=lg(g,120,GY,['rgba(220,240,255,0)','rgba(220,240,255,.6)']);g.fillRect(0,120,W,72);
 g.L(1);
 const roof=(cx,y,w)=>{poly(g,'#7a1a2a',[[cx-w/2-8,y+10],[cx-w/2+4,y],[cx+w/2-4,y],[cx+w/2+8,y+10]]);poly(g,'#c8283a',[[cx-w/2-8,y+10],[cx-w/2+4,y],[cx+w/2-4,y],[cx+w/2+8,y+10],[cx+w/2-2,y+8],[cx,y+2],[cx-w/2+2,y+8]]);rect(g,'#f4faff',cx-w/2+2,y-2,w-4,3);rect(g,'#f4faff',cx-w/2-6,y+8,10,2);rect(g,'#f4faff',cx+w/2-4,y+8,10,2)};
 let y=FT;[[84,26],[68,24],[54,22],[40,20]].forEach(([w,h])=>{y-=h;rect(g,'#e8d8b8',200-w/2+6,y+8,w-12,h-8);rect(g,'#7a4a2a',200-w/2+6,y+8,3,h-8);rect(g,'#7a4a2a',200+w/2-9,y+8,3,h-8);rect(g,'#ffd078',192,y+12,16,h-16);glow(g,200,y+18,26,'255,200,100',.35);roof(200,y,w)});
 rect(g,'#7a1a2a',199,y-20,2,20);circ(g,'#ffd34d',200,y-22,2);
 rect(g,'#c8283a',66,GY-80,5,76);rect(g,'#c8283a',112,GY-80,5,76);rect(g,'#7a1a2a',56,GY-88,66,6);rect(g,'#c8283a',62,GY-76,54,4);rect(g,'#f4faff',56,GY-90,66,3);
 const pine=(x,b,s)=>{for(let k=0;k<4;k++){const w=(28-k*5)*s,yy=b-k*15*s;poly(g,'#16443a',[[x-w,yy],[x,yy-26*s],[x+w,yy]]);poly(g,'#f4faff',[[x-w*.55,yy-12*s],[x,yy-26*s],[x+w*.55,yy-12*s],[x,yy-16*s]])}rect(g,'#4a2a1a',x-2,b,4,8)};
 pine(22,FT+4,1.2);pine(52,FT,.8);pine(382,FT+4,1.2);pine(340,FT-2,.7);
 g.L(2);
 g.fillStyle=lg(g,FT,H,['#a8c8e8','#7fa4cf','#5a7fb0']);g.fillRect(0,FT,W,H);
 for(let y2=FT,k=0;y2<H;y2+=13,k++){rect(g,'rgba(0,0,40,.25)',0,y2,W,1);rect(g,'rgba(255,255,255,.18)',0,y2+1,W,1);for(let x=(k*29)%60;x<W;x+=60)rect(g,'rgba(0,0,40,.2)',x+k*3,y2,1,13)}
 for(let i=0;i<8;i++)poly(g,'rgba(255,255,255,.12)',[[40+i*52,FT],[52+i*52,FT],[20+i*52,H],[8+i*52,H]]);
 for(let k=0;k<5;k++){g.strokeStyle='rgba(30,50,110,.5)';g.lineWidth=1;g.beginPath();let x=r()*W,yy=FT+r()*60;g.moveTo(x,yy);for(let j=0;j<5;j++){x+=(r()-.4)*14;yy+=(r()-.3)*6;g.lineTo(x,yy)}g.stroke()}
 const lant=(x,b)=>{rect(g,'#8a9ab8',x-3,b-8,6,10);rect(g,'#a8b8d4',x-6,b-18,12,10);rect(g,'#ffd078',x-3,b-16,6,6);poly(g,'#8a9ab8',[[x-9,b-18],[x,b-26],[x+9,b-18]]);rect(g,'#f4faff',x-8,b-20,16,2);glow(g,x,b-14,24,'255,200,100',.4)};lant(318,FT+30);lant(352,FT+34);lant(44,FT+36);
 g.fillStyle='#f4faff';g.beginPath();g.ellipse(0,H,70,22,0,0,7);g.fill();g.beginPath();g.ellipse(W,H,80,26,0,0,7);g.fill();
 g.L(3);vign(g,.35)}));
// ===== 5 · VULCÃO =====
STG.push(mkStage(g=>{const r=rngf(33);
 g.fillStyle=lg(g,0,GY,['#14040a','#5a0e18','#c8341a','#ff9a30']);g.fillRect(0,0,W,H);
 for(let i=0;i<14;i++){g.fillStyle='rgba(30,8,12,'+(.18+r()*.2)+')';g.beginPath();g.ellipse(r()*W,10+r()*80,40+r()*40,10+r()*10,0,0,7);g.fill()}
 poly(g,'#3a1216',[[250,GY],[330,98],[346,98],[420,GY]]);g.fillStyle='#ff9a30';g.beginPath();g.ellipse(338,98,9,2.5,0,0,7);g.fill();
 poly(g,'#241014',[[30,GY],[150,62],[202,62],[330,GY]]);poly(g,'#3a181c',[[30,GY],[150,62],[168,62],[120,GY]]);
 glow(g,176,62,120,'255,170,60',.7);
 g.fillStyle='#ffd070';g.beginPath();g.ellipse(176,62,26,6,0,0,7);g.fill();g.fillStyle='#ff7a1a';g.beginPath();g.ellipse(176,63,20,4,0,0,7);g.fill();
 for(let k=0;k<4;k++){let x=162+k*9,y=66;g.beginPath();g.moveTo(x,y);while(y<GY-6){x+=(r()-.5)*14+(k-1.5)*3;y+=10+r()*10;g.lineTo(x,y)}g.strokeStyle='#ff5a14';g.lineWidth=3;g.stroke();g.strokeStyle='#ffd070';g.lineWidth=1;g.stroke()}
 g.L(1);
 for(let i=0;i<9;i++){const x=r()*W,h=14+r()*24,w=16+r()*20;poly(g,'#1e0c10',[[x-w,FT-4],[x-w*.4,FT-h],[x+w*.4,FT-h*.8],[x+w,FT-4]])}
 g.fillStyle=lg(g,170,FT,['#ff5a14','#ffb030','#ff7a1a']);g.fillRect(0,172,W,FT-172);glow(g,200,178,220,'255,120,30',.35);
 for(let i=0;i<30;i++)rect(g,'#2a1014',r()*W,172+r()*10,6+r()*14,2+r()*3);
 g.L(2);
 g.fillStyle=lg(g,FT,H,['#3a1c20','#2a1418','#1a0a0e']);g.fillRect(0,FT,W,H);rect(g,'#ff7a1a',0,FT,W,1);
 for(let y=FT,k=0;y<H;y+=12,k++){rect(g,'rgba(0,0,0,.4)',0,y,W,1);rect(g,'rgba(255,140,60,.1)',0,y+1,W,1);for(let x=(k*41)%70;x<W;x+=70)rect(g,'rgba(0,0,0,.35)',x+k*5,y,1,12)}
 for(let k=0;k<9;k++){let x=r()*W,y=GY+r()*60;g.beginPath();g.moveTo(x,y);for(let j=0;j<6;j++){x+=(r()-.3)*18;y+=(r()-.5)*8;g.lineTo(x,y)}g.strokeStyle='#ff7a1a';g.lineWidth=2;g.stroke();g.strokeStyle='#ffd070';g.lineWidth=1;g.stroke()}
 const spike=(x,b,h,w)=>{poly(g,'#14080c',[[x-w,b],[x-w*.3,b-h],[x+w*.2,b-h*.72],[x+w,b]]);g.strokeStyle='#ff6a1a';g.lineWidth=1;g.beginPath();g.moveTo(x-w*.3,b-h);g.lineTo(x-w,b);g.stroke()};
 spike(20,H,120,22);spike(54,H,70,14);spike(380,H,110,22);spike(348,H,64,14);
 g.L(3);vign(g,.5)}));
// ===== ANIMAÇÕES =====
const STGA=[
()=>{const f=.14+.1*Math.sin(G.st*.09)+(G.st%113<3?.3:0);X.fillStyle='rgba(255,46,154,'+f+')';X.fillRect(6,56,72,28);X.fillStyle='rgba(34,224,255,'+f*.9+')';X.fillRect(322,78,68,26);
 const tt=(G.st%900)/900;if(tt<.3){const x=W+30-(tt/.3)*(W+300);X.fillStyle='#14081f';X.fillRect(x,82,260,18);X.fillStyle='#5a4a8a';X.fillRect(x,82,260,2);for(let k=0;k<12;k++){X.fillStyle=k%2?'#ffd27a':'#7af0ff';X.fillRect(x+6+k*21,86,14,8)}}
 const P=part('r',120,()=>({x:R()*(W+40),y:R()*H,v:5+R()*3}));P.forEach(p=>{p.y+=p.v;p.x-=1.2;if(p.y>H){p.y=-8;p.x=R()*(W+40)}X.fillStyle='rgba(180,200,255,.38)';X.fillRect(p.x|0,p.y|0,1,5)});
 for(let k=0;k<3;k++){const x=((G.st*1.7+k*140)%420),y=FT+20+k*14,a=(G.st*.2+k)%6;X.strokeStyle='rgba(200,220,255,'+(.4-a*.06)+')';X.beginPath();X.ellipse(x,y,a+1,(a+1)*.3,0,0,7);X.stroke()}},
()=>{const P=part('s',45,()=>({x:R()*W,y:R()*H,vx:.3+R()*.4,vy:.35+R()*.5,ph:R()*6}));
 for(let k=0;k<3;k++){const x=((G.st*.12+k*160)%520)-60;X.fillStyle='rgba(255,200,230,.16)';X.beginPath();X.ellipse(x,40+k*18,50,8,0,0,7);X.fill()}
 [[128,78],[322,78]].forEach(([x,y])=>{const a=.2+.12*Math.sin(G.st*.07+x),rg=X.createRadialGradient(x,y,2,x,y,28);rg.addColorStop(0,'rgba(255,200,90,'+(a+.3)+')');rg.addColorStop(1,'rgba(255,160,60,0)');X.fillStyle=rg;X.fillRect(x-30,y-30,60,60)});
 const F2=part('f',16,()=>({x:R()*W,y:120+R()*70,ph:R()*6}));F2.forEach(p=>{const a=.5+.5*Math.sin(G.st*.05+p.ph);X.fillStyle='rgba(255,240,120,'+a+')';X.fillRect((p.x+Math.sin(G.st*.02+p.ph)*8)|0,(p.y+Math.cos(G.st*.03+p.ph)*5)|0,2,2)});
 P.forEach(p=>{p.x+=p.vx+Math.sin(G.st*.05+p.ph)*.35;p.y+=p.vy;if(p.y>H||p.x>W){p.y=-4;p.x=R()*W*.9}X.fillStyle=p.ph>3?'#ffb6d2':'#ff8fbd';X.fillRect(p.x|0,p.y|0,2,1);X.fillRect((p.x|0)+1,(p.y|0)+1,1,1)})},
()=>{for(let k=0;k<3;k++){const y=168+k*5;X.fillStyle='rgba(255,255,255,'+(.6-k*.14)+')';for(let x=-20;x<W;x+=26){const o=Math.sin(G.st*.04+k*2+x*.05)*4;X.fillRect(x+o+k*6,y,14,1);X.fillRect(x+o+k*6+3,y+1,8,1)}}
 for(let i=0;i<8;i++)if((G.st*.7+i*37)%60<3){X.fillStyle='#fff9d0';X.fillRect(250+((i*53)%50),146+((i*29)%24),2,1)}
 const gx=(G.st*.5)%520-60,f=Math.floor(G.st/10)%2;X.fillStyle='#fff';[[gx,50],[gx+44,62],[gx+90,44]].forEach(([x,y])=>{X.fillRect(x,y+f,3,1);X.fillRect(x+3,y+1-f,2,1);X.fillRect(x-3,y+1-f,3,1)});
 const tw=Math.floor(G.st/14)%2;X.fillStyle='rgba(255,255,255,.5)';X.fillRect(120+tw,FT+20,1,1)},
()=>{[0,1].forEach(i=>{const a=Math.sin(G.st*.02+i*3)*.5,x0=i?340:60,xe=x0+Math.sin(a)*170;X.fillStyle='rgba(255,240,180,.11)';X.beginPath();X.moveTo(x0,0);X.lineTo(xe-28,GY);X.lineTo(xe+28,GY);X.fill()});
 for(let i=0;i<3;i++)if(R()<.05){const x=R()*W,y=44+R()*100;X.fillStyle='rgba(255,255,255,.4)';X.fillRect(x-1,y-1,4,4);X.fillStyle='#fff';X.fillRect(x,y,2,2)}
 if(G.st%50<25){X.fillStyle='rgba(255,255,255,.12)';X.fillRect(152+((G.st*2)%90),8,10,32)}
 for(let k=0;k<26;k++){const x=8+k*15.4,bob=Math.sin(G.st*.15+k)*3;if(k%3==0){X.fillStyle='#e9b98a';X.fillRect(x,134-bob,2,5);X.fillRect(x+3,136+bob*.5,2,4)}}},
()=>{for(let k=0;k<3;k++){X.fillStyle='rgba('+['80,255,170','120,200,255','255,120,220'][k]+',.10)';X.beginPath();X.moveTo(0,0);for(let x=0;x<=W;x+=20)X.lineTo(x,24+k*14+Math.sin(x*.025+G.st*.02+k)*12);X.lineTo(W,0);X.fill()}
 for(let x=0;x<W;x+=2){const t=x/W,y=56+16*Math.sin(t*Math.PI)+Math.sin(G.st*.06+x*.05);X.fillStyle='#3a2a2a';X.fillRect(x,y,2,1)}
 for(let i=0;i<22;i++){const t=(i+.5)/22,x=t*W,y=56+16*Math.sin(t*Math.PI)+Math.sin(G.st*.06+x*.05)+Math.sin(G.st*.12+i)*.8;X.fillStyle=['#e8403a','#f5c82e','#3aa0f0','#58d68d','#f2f2f2'][i%5];X.fillRect(x-3,y+1,6,5);X.fillRect(x-2,y+6,4,2);X.fillRect(x-1,y+8,2,1)}
 const P=part('n',90,()=>({x:R()*W,y:R()*H,v:.4+R()*.8,ph:R()*6}));P.forEach(p=>{p.y+=p.v;p.x+=Math.sin(G.st*.03+p.ph)*.4+.2;if(p.y>H){p.y=-3;p.x=R()*W}X.fillStyle='rgba(255,255,255,.9)';const s=p.v>.9?2:1;X.fillRect(p.x|0,p.y|0,s,s)})},
()=>{const g=.12+.08*Math.sin(G.st*.08);X.fillStyle='rgba(255,120,30,'+g+')';X.fillRect(0,172,W,88);
 X.fillStyle='rgba(255,200,80,'+(g*1.5)+')';for(let x=0;x<W;x+=14)X.fillRect(x+((G.st*.6)%14),176+Math.sin(x+G.st*.1)*3,6,1);
 const lt=G.st%420;if(lt<8){X.fillStyle='rgba(255,230,200,'+(.3-lt*.03)+')';X.fillRect(0,0,W,GY);if(lt<5){X.strokeStyle='#fff';X.lineWidth=2;X.beginPath();let x=100+((G.st/420|0)*97)%220,y=0;X.moveTo(x,y);while(y<100){x+=(R()-.5)*22;y+=14;X.lineTo(x,y)}X.stroke()}}
 const B=part('b',22,()=>({a:0,v:0,x:0,y:0,t:99}));B.forEach(p=>{p.t++;if(p.t>60&&R()<.01){p.t=0;p.x=176+(R()-.5)*14;p.y=64;p.vx=(R()-.5)*1.4;p.vy=-2-R()*1.6}if(p.t<60){p.x+=p.vx;p.y+=p.vy;p.vy+=.08;X.fillStyle=p.t%4<2?'#ffe27a':'#ff7a1a';X.fillRect(p.x|0,p.y|0,2,2)}});
 const P=part('v',70,()=>({x:R()*W,y:R()*H,v:.3+R()*.9,ph:R()*6}));P.forEach(p=>{p.y-=p.v;p.x+=Math.sin(G.st*.04+p.ph)*.5;if(p.y<-4){p.y=H;p.x=R()*W}X.fillStyle=p.v>.8?'#ffe27a':'#ff8a2a';const s=p.v>.9?2:1;X.fillRect(p.x|0,p.y|0,s,s)});
 X.fillStyle='rgba(40,10,14,.2)';for(let k=0;k<3;k++){const x=((G.st*.15+k*150)%520)-60;X.beginPath();X.ellipse(x,60+k*8,60,14,0,0,7);X.fill()}}
];

const TQ=[];function T(s,x,y,sz,col,al){TQ.push([s,x,y,sz,col,al])}
function flushT(){V.lineJoin='round';for(const[s,x,y,sz,col,al]of TQ){const big=sz>=9,fs=(big?Math.max(7,sz*.66):Math.max(9,sz*1.35))*S;
 V.font=big?fs+'px "Press Start 2P","Courier New",monospace':'700 '+fs+'px "Chakra Petch","Trebuchet MS",sans-serif';V.textAlign=al||'center';
 V.lineWidth=fs*.3;V.strokeStyle='#14081f';V.strokeText(s,x*S,y*S);
 if(Array.isArray(col)){const g=V.createLinearGradient(0,(y-sz)*S,0,y*S);g.addColorStop(0,col[0]);g.addColorStop(1,col[1]);V.fillStyle=g}else V.fillStyle=col||'#fff';
 V.fillText(s,x*S,y*S)}TQ.length=0}
function spr(n,an,i,x,y,face,sc){sc=sc||1;X.save();X.translate(Math.round(x),Math.round(y));X.scale(face,1);X.drawImage(IMG[n][an],i*100,0,100,100,-46*sc,-94*sc,100*sc,100*sc);X.restore()}
// lutadores
const mkF=(n,face)=>({n,x:0,y:0,vx:0,vy:0,hp:STAT[n].hp,mhp:STAT[n].hp,gd:GMX(n),sp:0,face,st:'idle',t:0,hit:false,kb:0,cd:0,aiT:0,mode:'app',wins:0});
let G={s:'title',dbg:!!CFG.dbg,stI:0,mode:1,sel:[0,1],lock:[0,0],cp:0,st:0,rd:1,ph:'intro',pt:0,sh:0,w:-1},F=[],spk=[],timer=60,tick=0;
function toSel(m){G.mode=m;G.s='sel';G.lock=[0,0];G.sel=[0,1];G.cp=0}
function pickCard(i){if(!G.lock[0]){G.sel[0]=i;G.lock[0]=1}else if(G.mode==2&&!G.lock[1]){G.sel[1]=i;G.lock[1]=1}}
function newRound(){F.forEach((f,i)=>{Object.assign(f,{x:i?290:110,y:0,vy:0,vx:0,hp:f.mhp,gd:GMX(f.n),face:i?-1:1,st:'idle',t:0,kb:0,hit:false,cd:30});});G.ph='intro';G.pt=0;timer=60;tick=0;spk=[];projs=[]}
function goStage(i){G.stI=i;G.s='fight';startMatch();if(!CFG.tut){G.tut={i:0,t:0,mv:0,lx:null,h:{l:0,h:0,sp:0},ok:0};G.ph='play';G.pt=0;F[0].x=110;F[1].x=290}}
function startMatch(){G.tut=null;for(const k in PART)delete PART[k];F=[mkF(NAMES[G.sel[0]],1),mkF(NAMES[G.sel[1]],-1)];G.rd=1;newRound()}
const go=(f,k)=>{f.st=k;f.t=0;f.hit=false};
function hurtDo(d,dir,dmg,kb,knock,src,x,y,kind){if(G.tut&&src===F[0]){G.tut.h[(src.st=='l'||src.st=='h')?src.st:'sp']++}
 if(d.st=='gbreak'){dmg=Math.round(dmg*1.35);knock=1}
 if(d.st=='block'&&d.face==-dir){const fc=(src.st=='l'||src.st=='h')?.2:.4;d.hp=Math.max(0,d.hp-Math.max(1,Math.round(dmg*fc)));
  if(d.hp>0){d.gd-=dmg*(src.st=='l'?1.6:src.st=='h'?2.2:2);
   if(d.gd<=0){d.gd=0;d.st='gbreak';d.t=0;d.kb=dir*3;d.face=-dir;G.sh=8;G.fl=5;G.cap={s:'GUARD BREAK!',t:55};sfx('gbreak');for(let k=0;k<4;k++)spk.push({x:x+(k-1.5)*5,y:y+(k%2?-6:6),t:0,b:1});src.sp=Math.min(100,src.sp+25);return}
   d.bt=10;d.x+=dir*Math.min(kb,4)*.9;spk.push({x,y,t:0,b:1});G.sh=1;sfx('block');src.sp=Math.min(100,src.sp+dmg*1.2);d.sp=Math.min(100,d.sp+dmg*1.2);return}}d.hp=Math.max(0,d.hp-dmg);d.kb=dir*kb;d.t=0;d.face=-dir;const air=d.y<0;d.y=0;d.st=(d.hp<=0||knock||air)?'down':'hurt';
 spk.push({x,y,t:0});G.sh=knock?6:3;src.sp=Math.min(100,src.sp+dmg*2.8);d.sp=Math.min(100,d.sp+dmg*1.8);sfx(kind||'punch');if(d.hp<=0)sfx('ko')}
function tryHit(a,d,A,an){
 if(d.st=='down'||d.st=='getup')return;
 const E=ext(a.n,an,Math.floor(a.t/A.spd)),dx=(d.x-a.x)*a.face,hw=HW[d.n]||10,ty=GY+a.y+(E.fy-94);
 if(E.fx>0&&dx-hw<=E.fx+1&&dx+hw>=0&&ty+10>=GY+d.y-74&&ty-10<=GY+d.y+2){
  a.hit=true;hurtDo(d,a.face,A.dmg,A.kb||3,A.knock,a,a.x+a.face*Math.min(E.fx,Math.max(dx,8)),ty,an=='Special'?'ultmelee':/Kick|Attack4/.test(an)?(A.knock?'kickh':'kick'):(A.knock?'punchh':'punch'));
 }}
function projStep(a,b){projs.forEach(p=>{p.x+=p.vx;p.t++;
  if(p.type=='hat'&&p.t==20)p.vx=-p.vx*1.1;
  if(p.type=='wave'&&p.t%4==0)p.r=Math.max(4,p.r-.25);
  const d=p.o===a?b:a;if(d.st=='down'||d.st=='getup')return;
  if(Math.abs(p.x-d.x)<(HW[d.n]||10)+p.r&&p.y+p.r>=GY+d.y-74&&p.y-p.r<=GY+d.y+2){p.dead=1;hurtDo(d,p.dir,p.dmg,p.kb,p.knock,p.o,p.x,p.y,'projhit')}});
 projs=projs.filter(p=>!p.dead&&p.x>-30&&p.x<W+30&&p.t<60)}
function step(f,o,c){
 const A=(f.st=='l'||f.st=='h')?MV[f.n][f.st]:null;f.t++;if(f.st!='block'&&f.st!='gbreak'&&f.gd<GMX(f.n))f.gd=Math.min(GMX(f.n),f.gd+.22);
 if(f.st=='down'){f.x+=f.kb;f.kb*=.9;if(f.hp>0&&f.t>60)go(f,'getup')}
 else if(f.st=='getup'){if(f.t>18)go(f,'idle')}
 else if(f.st=='hurt'){f.x+=f.kb;f.kb*=.85;if(f.t>16)go(f,'idle')}
 else if(A){const fr=Math.floor(f.t/A.spd);if(!f.hit&&fr>=A.act[0]&&fr<=A.act[1])tryHit(f,o,A,A.an);if(fr>=NF(f.n,A.an))go(f,'idle')}
 else if(f.st=='sp'){const D=SP[f.n],fr=Math.floor(f.t/D.spd);
  if(fr>=D.mv[0]&&fr<=D.mv[1])f.x+=D.vx*f.face;
  if(D.proj&&!f.fired&&fr>=D.proj){f.fired=1;projs.push({type:D.pj.type,x:f.x+f.face*22,y:GY+D.pj.y,vx:f.face*D.pj.vx,dir:f.face,r:D.pj.r,o:f,t:0,dmg:D.pdmg||D.dmg,kb:D.pj.kb,knock:D.pj.knock});sfx('proj')}
  if(!D.proj||D.melee){const ia=fr>=D.act[0]&&fr<=D.act[1];if(D.multi&&ia&&f.t%D.spd==0)f.hit=false;if(!f.hit&&ia)tryHit(f,o,D.multi?{...D,knock:fr>=D.act[1]}:D,'Special')}
  if(fr>=NF(f.n,'Special'))go(f,'idle')}
 else if(f.st=='gbreak'){f.x+=f.kb;f.kb*=.85;if(f.t>75){go(f,'idle');f.gd=GMX(f.n)*.5}}
 else if(f.st=='block'){f.face=o.x>=f.x?1:-1;if(f.bt>0)f.bt--;if(!c.b)go(f,'idle')}
 else if(f.st=='jump'){if(f.t==4)f.vy=-6.2;if(f.t>4){f.y+=f.vy;f.vy+=.38;f.x+=f.vx;if(f.y>=0){f.y=0;go(f,'idle')}}}
 else{
  f.face=o.x>=f.x?1:-1;
  if(c.u){sfx('jump');go(f,'jump');f.vx=((c.r?1:0)-(c.l?1:0))*1.5}
  else if(c.b){go(f,'block');f.bt=0}else if(c.sp&&f.sp>=100){f.sp=0;go(f,'sp');f.fired=0;G.fl=7;G.cap={s:SP[f.n].name,t:70};sfx('ult')}else if(c.hv){sfx('whoosh');go(f,'h')}else if(c.lt){sfx('whoosh');go(f,'l')}
  else{const m=(c.r?1:0)-(c.l?1:0);f.x+=m*STAT[f.n].sp;const ns=m?'walk':'idle';if(f.st!=ns)f.t=0;f.st=ns}
 }
 f.x=Math.max(24,Math.min(W-24,f.x));
}
function ai(f,o){
 const c={},d=o.x-f.x,ad=Math.abs(d);f.cd--;if((o.st=='l'||o.st=='h'||o.st=='sp')&&ad<110&&!(f.blk>0)&&R()<.1*DF())f.blk=16;if(f.blk>0){f.blk--;return{b:1}}
 if(--f.aiT<=0){f.aiT=10+R()*25;f.mode=ad>60?'app':(R()<.5?'atk':R()<.5?'back':'app')}
 const tw=d>0?'r':'l',aw=d>0?'l':'r';
 if(f.mode=='app'&&ad>40)c[tw]=1;
 if(f.mode=='back'&&ad<110)c[aw]=1;
 if(ad<56&&f.cd<=0&&R()<.12*DF()){const r=R();c[r<.6?'lt':'hv']=1;f.cd=(22+R()*30)/DF()}
 if(f.sp>=100&&f.cd<=0&&((SP[f.n].pj&&ad>70&&ad<240)||ad<60)&&R()<.05*DF()){c.sp=1;f.cd=40}
 if(R()<.004)c.u=1;
 return c;
}
function separate(){const[a,b]=F;if(a.y==0&&b.y==0){const dx=b.x-a.x,mn=(HW[a.n]||10)+(HW[b.n]||10);if(Math.abs(dx)<mn){const m=(mn-Math.abs(dx))/2,s=dx>=0?1:-1;a.x-=s*m;b.x+=s*m}}}
function setPause(v){G.paused=v;for(const k in keys)keys[k]=0;try{if(AC){v?AC.suspend():AC.resume()}}catch(e){}}
const K=(t,k)=>showPad()?t:k;
const TUT=[['MOVIMENTO',()=>'Ande com '+K('◀ ▶','A / D')+' (avance e recue)'],
['PULO',()=>'Aperte '+K('▲','W')+' para pular'],
['ATAQUE LEVE',()=>'Chegue perto e use '+K('LEVE','J')+' duas vezes'],
['ATAQUE PESADO',()=>'Agora o '+K('PESADO','K')+': mais lento, derruba'],
['ULT',()=>'Barra cheia! Aperte '+K('ULT','R')+' pro golpe especial'],
['DEFESA',()=>'Segure '+K('DEF','S')+' pra bloquear (a guarda pode quebrar)'],
['PRONTO!',()=>'Você já sabe o básico. Boa luta!']];
function tutNext(){const t=G.tut;t.i++;t.t=0;t.ok=45;if(t.i==2||t.i==3)F[1].x=Math.min(340,F[0].x+64)}
function tutEnd(){G.tut=null;CFG.tut=1;saveCfg();F.forEach(f=>f.wins=0);G.rd=1;newRound();G.toast={s:'Tutorial concluído! Boa sorte!',t:120}}
function tutUpdate(a,b){const t=G.tut;t.t++;if(b.hp<b.mhp*.45)b.hp=b.mhp;b.sp=0;const i=t.i;
 if(i==0){if(t.lx!=null)t.mv+=Math.abs(a.x-t.lx);t.lx=a.x;if(t.mv>110)tutNext()}
 else if(i==1){if(a.st=='jump')t.j=1;if(t.j&&a.st!='jump')tutNext()}
 else if(i==2){if(t.h.l>=2)tutNext()}
 else if(i==3){if(t.h.h>=1)tutNext()}
 else if(i==4){if(!t.u)a.sp=100;if(a.st=='sp'&&!t.u){t.u=1;t.ut=t.t}if(t.u&&t.t>t.ut+110)tutNext()}
 else if(i==5){if(a.st=='block')t.bk=(t.bk||0)+1;if(t.bk>45)tutNext()}
 else if(i==6){if(t.t>150)tutEnd()}}
function drawTut(){const t=G.tut;if(G.cap&&G.cap.t>0)return;const[ti,tx]=TUT[t.i];
 panel(40,48,320,46,.88);T(ti,52,64,9,'#ffd34d','left');T(tx(),52,80,7,'#fff','left');
 for(let i=0;i<TUT.length-1;i++){X.fillStyle=i<t.i?'#58d68d':(i==t.i?'#ffd34d':'#3a3050');X.fillRect(52+i*14,86,10,3)}
 if(t.ok>0){t.ok--;X.fillStyle='#58d68d';X.fillRect(330,70,12,4);X.fillRect(336,64,4,10)}
 btn(298,54,54,16,'PULAR',tutEnd,{sz:8,c:'#6a3a8a',hc:'#9a66c0'})}
function update(){
 if((press.Escape||press.KeyP)&&G.s=='fight')setPause(!G.paused);else if(press.Escape)G.s='title';
 if(G.paused){for(const k in press)delete press[k];return}
 G.st++;musicStart(G.s=='fight'?G.stI:6);
 if(press.KeyB)G.dbg=!G.dbg;
 if(G.s=='title'){
  if(press.Enter)toSel(1)
 }else if(G.s=='mode'){if(press.Enter)toSel(1)
 }else if(G.s=='sel'){
  [P1,P2].forEach((k,p)=>{if(p==1&&G.mode==1||G.lock[p])return;
   if(press[k.l])G.sel[p]=(G.sel[p]+NAMES.length-1)%NAMES.length;if(press[k.r])G.sel[p]=(G.sel[p]+1)%NAMES.length;if(press[k.a1])G.lock[p]=1});
  if(G.mode==1&&G.lock[0]&&!G.lock[1]){if(G.st%6==0)G.sel[1]=(G.sel[1]+1)%NAMES.length;if(++G.cp>45)G.lock[1]=1}
  if(G.lock[0]&&G.lock[1]){G.s='stg';G.stI=0}
 }else if(G.s=='stg'){const N=STG.length;
  if(press.KeyA||press.ArrowLeft)G.stI=(G.stI+N-1)%N;if(press.KeyD||press.ArrowRight)G.stI=(G.stI+1)%N;
  if(press.KeyW||press.ArrowUp)G.stI=(G.stI+N-3)%N;if(press.KeyS||press.ArrowDown)G.stI=(G.stI+3)%N;
  if(press.KeyJ||press.Enter||press.Comma)goStage(G.stI);
 }else if(G.s=='fight'){
  const[a,b]=F;G.pt++;
  if(G.ph=='intro'){a.t++;b.t++;if(G.pt>110){G.ph='play';G.pt=0}}
  else if(G.ph=='play'){
   step(a,b,readIn(P1));step(b,a,G.tut?{}:ai(b,a));if(G.tut)tutUpdate(a,b);separate();
   projStep(a,b);
   if(!G.tut&&++tick%60==0)timer--;
   if(!G.tut&&(a.hp<=0||b.hp<=0||timer<=0)){G.ph='ko';G.pt=0;G.w=a.hp==b.hp?-1:a.hp>b.hp?0:1;if(G.w>=0)F[G.w].wins++}
  }else{
   step(a,b,{});step(b,a,{});separate();
   if(G.ph=='ko'&&G.pt>150){if(F.some(f=>f.wins>=2)){G.ph='end';G.pt=0}else{G.rd++;newRound()}}
   if(G.ph=='end'&&press.Enter)G.s='title';
  }
  spk.forEach(s=>s.t++);spk=spk.filter(s=>s.t<8);
 }
 for(const k in press)delete press[k];
}
function draw(f){
 let an,i;const n=f.n;
 switch(f.st){
  case'idle':an='Idle';i=Math.floor(f.t/7)%NF(n,an);break;
  case'walk':an='Walk';i=Math.floor(f.t/5)%NF(n,an);break;
  case'jump':an='Jump';i=f.t<4?0:f.vy<-3?1:f.vy<2?2:f.vy<5?3:4;break;
  case'hurt':an='Hurt';i=Math.min(4,Math.floor(f.t/3));break;
  case'down':an='KnockDown';i=Math.min(4,Math.floor(f.t/5));break;
  case'gbreak':an='GuardBreak';i=f.t<5?0:f.t<14?1:(Math.floor(f.t/8)%2?3:2);break;
  case'block':an='Block';i=f.bt>0?2:(f.t<4?0:1);break;
  case'sp':an='Special';i=Math.min(NF(n,an)-1,Math.floor(f.t/SP[n].spd));break;
  case'getup':an='KnockDown';i=Math.max(0,3-Math.floor(f.t/5));break;
  default:{const A=MV[n][f.st];an=A.an;i=Math.min(NF(n,an)-1,Math.floor(f.t/A.spd))}
 }
 X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(f.x,GY,18-Math.min(8,-f.y/6),4,0,0,7);X.fill();
 spr(n,an,Math.min(i,NF(n,an)-1),f.x,GY+f.y,f.face);
 if(f.st=='gbreak'&&f.t>10){for(let k=0;k<3;k++){const a=f.t*.14+k*2.09,sx=f.x+Math.cos(a)*9,sy=GY+f.y-80+Math.sin(a)*3;X.fillStyle='#14081f';X.fillRect(sx-3,sy-1,6,3);X.fillRect(sx-1,sy-3,3,7);X.fillStyle='#ffe27a';X.fillRect(sx-2,sy,4,1);X.fillRect(sx,sy-2,1,5)}}
 if(f.st=='block'||f.gd<GMX(f.n)){const w=26,r=Math.max(0,f.gd/GMX(f.n)),bx=f.x-w/2,by=GY+f.y-86;X.fillStyle='#14081f';X.fillRect(bx-1,by-1,w+2,5);X.fillStyle=r>.5?'#4de0ff':r>.25?'#ffb030':'#ff4a3a';X.fillRect(bx,by,w*r,3)}
}
const panel=(x,y,w,h,a)=>{X.fillStyle='rgba(8,5,22,'+(a||.75)+')';X.beginPath();X.roundRect(x,y,w,h,6);X.fill();X.lineWidth=1;X.strokeStyle='rgba(255,255,255,.2)';X.stroke()};
function btn(x,y,w,h,label,fn,o={}){const b={x,y,w,h,fn};BT.push(b);const hv=hit(MP,b);
 X.fillStyle=hv?(o.hc||'#ff7ab8'):(o.c||'#ff2e88');X.beginPath();X.roundRect(x,y,w,h,6);X.fill();
 X.fillStyle='rgba(255,255,255,.28)';X.beginPath();X.roundRect(x+2,y+2,w-4,h/2-2,4);X.fill();
 X.lineWidth=2;X.strokeStyle='#120a1c';X.beginPath();X.roundRect(x,y,w,h,6);X.stroke();
 T(label,x+w/2,y+h/2+4,o.sz||11,'#fff');return hv}
function pad(l,key,cx,cy,r,sz){BT.push({x:cx-r,y:cy-r,w:2*r,h:2*r,key});X.fillStyle=keys[key]?'rgba(255,211,77,.85)':'rgba(10,6,24,.55)';X.beginPath();X.arc(cx,cy,r,0,7);X.fill();X.lineWidth=2;X.strokeStyle='rgba(255,255,255,.55)';X.stroke();T(l,cx,cy+(sz>9?5:3),sz,'#fff')}
const TOP={};function topRow(n){if(TOP[n]==null){const cv=document.createElement('canvas');cv.width=100;cv.height=100;const c=cv.getContext('2d');c.drawImage(IMG[n].Idle,0,0);const d=c.getImageData(0,0,100,100).data;let t=0;o:for(let y=0;y<100;y++)for(let x=0;x<100;x++)if(d[(y*100+x)*4+3]>40){t=y;break o}TOP[n]=t}return TOP[n]}
function hud(){
 for(let p=0;p<2;p++){const f=F[p],bw=135,bx=p?225:40,px=p?366:8;
  panel(px-2,6,28,28,.85);X.drawImage(IMG[f.n].Idle,34,topRow(f.n)-1,32,32,px,8,24,24);
  X.fillStyle='#120a1c';X.beginPath();X.roundRect(bx-2,14,bw+4,13,4);X.fill();X.fillStyle='#4a1420';X.fillRect(bx,16,bw,9);
  const hw=bw*f.hp/f.mhp,low=f.hp<=f.mhp*.3,g=X.createLinearGradient(0,16,0,25);g.addColorStop(0,low?'#ff8a7a':'#ffe27a');g.addColorStop(1,low?'#c0281e':'#f29a1c');
  X.fillStyle=g;X.fillRect(p?bx+bw-hw:bx,16,hw,9);X.fillStyle='rgba(255,255,255,.3)';X.fillRect(p?bx+bw-hw:bx,16,hw,2);
  X.fillStyle='#120a1c';X.fillRect(bx-1,28,bw+2,6);X.fillStyle='#2a1a4a';X.fillRect(bx,29,bw,4);const mw=bw*f.sp/100,rdy=f.sp>=100;X.fillStyle=rdy?(G.st%20<10?'#7dfcff':'#ffffff'):'#19a8e0';X.fillRect(p?bx+bw-mw:bx,29,mw,4);
  if(rdy&&G.st%40<28)T('ULT PRONTA',p?bx:bx+bw,43,7,'#7dfcff',p?'left':'right');
  T(DN(f.n).toUpperCase(),p?bx+bw:bx,11,8,'#fff',p?'right':'left');
  for(let i=0;i<2;i++){X.fillStyle=i<f.wins?'#ffd34d':'#3a3050';X.beginPath();X.arc(p?bx+bw-5-i*11:bx+5+i*11,40,3.5,0,7);X.fill();X.lineWidth=1;X.strokeStyle='#120a1c';X.stroke()}}
 panel(181,8,38,26,.85);T(G.tut?'--':String(Math.max(0,timer)),200,28,16,timer<=10?'#ff6a5a':'#fff');
}
const TAG={Capoeirista:'Só chutes',Luchador:'Só socos',Kunoichi:'Soco e chute',Punk:'Chute e soco',Sumo:'Tanque lento',Cangaceiro:'Chapéu voador',Monge:'Ki e chutes',Ciborgue:'Soco foguete'};
function drawProj(p){X.save();X.translate(p.x,p.y);const s=Math.sign(p.vx)||1;
 if(p.type=='star'){for(let k=1;k<4;k++){X.fillStyle='rgba(120,240,255,'+(.4-k*.1)+')';X.fillRect(-s*k*6-3,-2,6,4)}X.rotate(p.t*.6);X.fillStyle='#14081f';X.fillRect(-7,-2.5,14,5);X.fillRect(-2.5,-7,5,14);X.fillStyle='#fff';X.fillRect(-6,-1.5,12,3);X.fillRect(-1.5,-6,3,12);X.fillStyle='#22e0ff';X.fillRect(-2,-2,4,4)}
 else if(p.type=='hat'){X.rotate(p.t*.45);X.fillStyle='#14081f';X.fillRect(-10,-3,20,6);X.fillRect(-5,-7,10,6);X.fillStyle='#a8703a';X.fillRect(-9,-2,18,4);X.fillRect(-4,-6,8,5);X.fillStyle='#6e3c1e';X.fillRect(-4,-3,8,2);X.fillStyle='#ffd23c';X.fillRect(-1,-5,2,2)}
 else if(p.type=='ki'){const r=p.r+Math.sin(p.t*.6);for(let k=1;k<5;k++){X.fillStyle='rgba(120,240,255,'+(.35-k*.07)+')';X.beginPath();X.arc(-s*k*5,0,r-k,0,7);X.fill()}X.fillStyle='rgba(120,240,255,.4)';X.beginPath();X.arc(0,0,r+3,0,7);X.fill();X.fillStyle='#7df0ff';X.beginPath();X.arc(0,0,r,0,7);X.fill();X.fillStyle='#fff';X.beginPath();X.arc(0,0,r*.55,0,7);X.fill()}
 else if(p.type=='rocket'){for(let k=1;k<6;k++){X.fillStyle='rgba(80,230,255,'+(.6-k*.1)+')';X.fillRect(-s*(6+k*4),-2,5,4)}X.fillStyle='#14081f';X.fillRect(-6,-5,12,10);X.fillStyle='#e23246';X.fillRect(-5,-4,10,8);X.fillStyle='#ff8a96';X.fillRect(-4,-4,8,2);X.fillStyle='#fff';X.fillRect(s*3-1,-3,2,6)}
 else if(p.type=='crescent'){X.scale(s,1);X.lineCap='round';for(let k=1;k<5;k++){X.strokeStyle='rgba(140,240,255,'+(.35-k*.07)+')';X.lineWidth=4;X.beginPath();X.arc(-8-k*6,0,p.r+3,-1,1);X.stroke()}X.strokeStyle='#14081f';X.lineWidth=7;X.beginPath();X.arc(-8,0,p.r+4,-1.05,1.05);X.stroke();X.strokeStyle='#7df0ff';X.lineWidth=4;X.beginPath();X.arc(-8,0,p.r+4,-1,1);X.stroke();X.strokeStyle='#fff';X.lineWidth=1.5;X.stroke()}
 else{for(let k=0;k<5;k++){X.fillStyle='rgba(255,226,150,'+(.9-k*.17)+')';X.fillRect(-s*k*5-2,-p.r+k*1.2,5,p.r*2-k*2.4)}X.fillStyle='#fff';X.fillRect(-2,-p.r,3,p.r*2)}
 X.restore()}
function dbgDraw(){F.forEach(f=>{const hw=HW[f.n]||10;X.lineWidth=1;X.strokeStyle='#4df';X.strokeRect(f.x-hw,GY+f.y-74,hw*2,76);
 const m=(f.st=='l'||f.st=='h')?MV[f.n][f.st]:f.st=='sp'?SP[f.n]:null;if(m){const an=m.an||'Special',E=ext(f.n,an,Math.floor(f.t/m.spd));X.strokeStyle='#f44';X.strokeRect(f.face>0?f.x:f.x-E.fx,GY+f.y+E.fy-104,E.fx,20)}});
 projs.forEach(p=>{X.strokeStyle='#fa4';X.strokeRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)})}
function render(){
 BT.length=0;X.save();if(G.sh>0){X.translate((R()-.5)*G.sh,(R()-.5)*G.sh);G.sh-=.5}
 if(G.s=='fight'){drawStage(G.stI);STGA[G.stI]()}else X.drawImage(STG[0],0,0);const s=G.s;
 if(loaded<total){T('Carregando…',200,130,12)}
 else if(s=='title'){
  X.fillStyle='rgba(8,5,22,.35)';X.fillRect(0,0,W,H);
  T('STREET',203,73,40,'#7a1f5a');T('STREET',200,70,40,['#fff27a','#ff8a1c']);T('BRAWLERS',203,102,28,'#7a1f5a');T('BRAWLERS',200,99,28,['#ffffff','#ff6ad0']);
  ['Samurai','Sumo','Ciborgue','Boxeador'].forEach((n,i)=>spr(n,'Idle',Math.floor(G.st/7+i*2)%NF(n,'Idle'),i<2?50+i*50:300+(i-2)*50,GY,i<2?1:-1));
  btn(120,120,160,28,'JOGAR',()=>toSel(1),{sz:13});btn(120,154,160,28,'CONFIG',()=>{G.s='cfg'},{c:'#1f8bff',hc:'#6fd0ff',sz:12});btn(120,188,160,28,isFS()?'SAIR TELA CHEIA':'TELA CHEIA',()=>toggleFS(),{c:'#6a3a8a',hc:'#9a66c0',sz:11});
 }else if(s=='mode'){
  X.fillStyle='rgba(8,5,22,.5)';X.fillRect(0,0,W,H);
  T('MODO DE JOGO',200,44,16,['#fff27a','#ff8a1c']);panel(80,58,240,120,.78);
  btn(100,72,200,32,'CONTRA A CPU',()=>toSel(1),{sz:12});
  btn(100,114,200,32,'CONTRA AMIGOS',()=>{G.toast={s:'Multiplayer online em breve!',t:150}},{c:'#4a4560',hc:'#5c5678',sz:12});
  T('EM BREVE',200,163,7,'#ffd34d');
  btn(150,196,100,22,'VOLTAR',()=>{G.s='title'},{c:'#6a3a8a',hc:'#9a66c0',sz:10});
 }else if(s=='cfg'){
  X.fillStyle='rgba(8,5,22,.55)';X.fillRect(0,0,W,H);
  T('CONFIGURAÇÕES',200,30,16,['#fff27a','#ff8a1c']);panel(40,38,320,162,.82);
  [['EFEITOS',CFG.snd?'LIGADOS':'DESLIGADOS',()=>{CFG.snd=CFG.snd?0:1}],
   ['MÚSICA',CFG.mus?'LIGADA':'DESLIGADA',()=>{CFG.mus=CFG.mus?0:1}],
   ['DIFICULDADE',['FÁCIL','NORMAL','DIFÍCIL'][CFG.diff],()=>{CFG.diff=(CFG.diff+1)%3}],
   ['HITBOXES',CFG.dbg?'SIM':'NÃO',()=>{CFG.dbg=CFG.dbg?0:1;G.dbg=!!CFG.dbg}],
   ['BOTÕES NA TELA',['AUTO','LIGADO','DESLIGADO'][CFG.touch],()=>{CFG.touch=(CFG.touch+1)%3}],
   ['TUTORIAL','REVER',()=>{CFG.tut=0;G.toast={s:'O tutorial volta na próxima luta',t:150}}]
  ].forEach(([l,v,fn],i)=>{const y=46+i*25;T(l,54,y+13,9,'#fff','left');btn(216,y,132,20,v,()=>{fn();saveCfg()},{sz:9})});
  btn(150,206,100,22,'VOLTAR',()=>{G.s='title'},{c:'#6a3a8a',hc:'#9a66c0',sz:10});
 }else if(s=='sel'){
  T('ESCOLHA SEU LUTADOR',200,20,14,['#fff27a','#ff8a1c']);
  NAMES.forEach((n,i)=>{const x=5+(i%6)*66,y=30+Math.floor(i/6)*94,b={x,y,w:60,h:88,fn:()=>pickCard(i)};BT.push(b);
   if(hit(MP,b)&&!G.lock[0])G.sel[0]=i;
   panel(x,y,60,88,.78);
   if(G.sel[0]==i){X.strokeStyle='#ff5a5a';X.lineWidth=2;X.strokeRect(x+1,y+1,58,86);T('VOCÊ',x+17,y+12,8,'#ff7a7a')}
   if(G.sel[1]==i){X.strokeStyle='#5aa8ff';X.lineWidth=2;X.strokeRect(x+3,y+3,54,82);T('CPU',x+46,y+12,8,'#7ab8ff')}
   spr(n,'Idle',Math.floor(G.st/7)%NF(n,'Idle'),x+30,y+64,1,.7);T(DN(n).toUpperCase(),x+30,y+80,7,'#fff')});
  T(!G.lock[0]?'Clique no lutador ou use A/D + J':'Sorteando adversário…',200,228,9,'#fff');
  btn(150,235,100,21,'VOLTAR',()=>{G.s='title'},{c:'#6a3a8a',hc:'#9a66c0',sz:10});
 }else if(s=='stg'){
  X.fillStyle='rgba(8,5,22,.6)';X.fillRect(0,0,W,H);
  T('ESCOLHA O CENÁRIO',200,18,14,['#fff27a','#ff8a1c']);
  STG.forEach((c,i)=>{const x=12+(i%3)*128,y=26+Math.floor(i/3)*100,b={x,y,w:120,h:94,fn:()=>goStage(i)};BT.push(b);
   if(hit(MP,b))G.stI=i;
   panel(x,y,120,94,.8);X.drawImage(c,0,0,W,H,x+4,y+4,112,73);
   if(G.stI==i){X.strokeStyle='#ffd34d';X.lineWidth=2;X.strokeRect(x+1,y+1,118,92)}
   T(SNAME[i].toUpperCase(),x+60,y+89,7,'#fff')});
  btn(150,230,100,22,'ALEATÓRIO',()=>goStage((R()*STG.length)|0),{sz:9});
 }else{
  spk.forEach(s=>{const z=4+s.t*2;X.fillStyle='#fff';X.fillRect(s.x-z,s.y-1,z*2,2);X.fillRect(s.x-1,s.y-z,2,z*2);X.fillStyle=s.b?'#7df0ff':'#f2c230';X.fillRect(s.x-z/2,s.y-z/2,z,z)});
  const[a,b]=F;(a.st=='down'||a.st=='hurt'?[b,a]:[a,b]).forEach(draw);if(G.dbg)dbgDraw();projs.forEach(drawProj);
  drawFront();hud();if(G.tut)drawTut();if(G.cap&&G.cap.t>0){G.cap.t--;T(G.cap.s,200,66,18,['#fff27a','#ff4a1c'])}
  if(G.ph=='intro')T(G.pt<60?'ROUND '+G.rd:'FIGHT!',200,110,G.pt<60?24:30,'#ffd34d');
  if(G.ph=='ko')T(timer<=0?'TEMPO!':'K.O.',200,110,32,'#ff5a5a');
  if(G.ph=='end'){panel(90,80,220,92,.85);T(DN(F[G.w].n).toUpperCase()+' VENCEU!',200,108,16,'#ffd34d');
   btn(100,122,96,26,'REVANCHE',()=>startMatch(),{sz:10});btn(204,122,96,26,'MENU',()=>{G.s='title'},{c:'#6a3a8a',hc:'#9a66c0',sz:10})}
  else{if(showPad()){pad('◀','KeyA',28,236,17,10);pad('▶','KeyD',72,236,17,10);pad('▲','KeyW',50,206,17,10);pad('DEF','KeyS',100,212,15,6);pad('LEVE','KeyJ',316,240,17,6);pad('PESADO','KeyK',358,240,17,6);pad('ULT','KeyR',338,205,17,7)}
   btn(186,36,28,11,'II',()=>setPause(true),{sz:8,c:'#6a3a8a',hc:'#9a66c0'})}
 }
 if(G.paused&&G.s=='fight'){BT.length=0;TQ.length=0;X.fillStyle='rgba(8,5,22,.68)';X.fillRect(0,0,W,H);T('PAUSADO',200,78,22,['#fff27a','#ff8a1c']);
  btn(110,96,180,28,'CONTINUAR',()=>setPause(false),{sz:11});btn(110,130,180,28,'REINICIAR',()=>{setPause(false);startMatch()},{c:'#1f8bff',hc:'#6fd0ff',sz:11});btn(110,164,180,28,'MENU PRINCIPAL',()=>{setPause(false);G.s='title'},{c:'#6a3a8a',hc:'#9a66c0',sz:11})}
 if(G.toast&&G.toast.t>0){G.toast.t--;panel(70,228,260,24,.92);T(G.toast.s,200,244,8,'#fff')}
 C.style.cursor=BT.some(b=>!b.key&&hit(MP,b))?'pointer':'default';
 X.restore();V.imageSmoothingEnabled=false;V.filter='saturate(1.35) contrast(1.08) brightness(1.04)';V.drawImage(LC,0,0,W*S,H*S);V.filter='none';
 if(G.fl>0){V.fillStyle='rgba(255,255,255,'+G.fl*.08+')';V.fillRect(0,0,W*S,H*S);G.fl--}
 flushT();
}
let last=0,acc=0;
function loop(t){acc+=Math.min(100,t-last);last=t;while(acc>16.67){update();acc-=16.67}render();requestAnimationFrame(loop)}
requestAnimationFrame(t=>{last=t;loop(t)});
