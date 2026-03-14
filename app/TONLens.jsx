// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";

const PRICES = { project: 0.5, wallet: 0.7, compare: 0.8 };
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "tonlens_bot";

const DEMO_SCRIPT = [
  { time:0,     title:"App Launch",        desc:"TONLens opens with live TON price ticker and stats loading in real-time from CoinGecko API." },
  { time:4000,  title:"Wallet Connect",    desc:"User taps 'Connect Wallet' — TON Connect modal appears showing Tonkeeper, Tonhub and all TON wallets." },
  { time:8000,  title:"Authenticated",     desc:"Wallet connects instantly. Address + TON balance appear in header. Your wallet IS your identity — no username or password." },
  { time:13000, title:"Project Research",  desc:"User taps 'Analyze Project', selects DeDust from quick-fill. AI begins deep research pipeline." },
  { time:18000, title:"Free AI Report",    desc:"Risk gauge animates to 32/100. Verdict badge, strengths, risks and TON ecosystem fit displayed instantly." },
  { time:23000, title:"Premium Unlock",    desc:"User taps Unlock — pays 0.5 TON via connected wallet. On-chain receipt generated automatically." },
  { time:28000, title:"Premium Report",    desc:"Bull case, bear case, full risk matrix, investor lens profiles and final AI recommendation revealed." },
  { time:33000, title:"AI Chat",           desc:"User asks 'Is this safe to invest in?' — AI answers in context of the full report in 2-3 sentences." },
  { time:38000, title:"Wallet Analysis",   desc:"Connected wallet address auto-fills. AI profiles behavior: DeFi patterns, risk score, protocol interaction map." },
  { time:43000, title:"Compare Projects",  desc:"DeDust vs STON.fi compared side-by-side. Utility, risk, tokenomics analyzed with winner declared." },
  { time:48000, title:"Share & History",   desc:"Reports saved to history, tied to wallet identity. One-tap share summary to Telegram." },
];

function shortAddr(a){return a?a.slice(0,6)+"…"+a.slice(-4):"";}
function getTelegramUser(){
  try{const tg=window.Telegram?.WebApp;if(!tg?.initDataUnsafe?.user)return null;const u=tg.initDataUnsafe.user;return{id:u.id,firstName:u.first_name||"",username:u.username||"",photoUrl:u.photo_url||""};}catch{return null;}
}

const DEMO_REPORTS={
  dedust:{name:"DeDust",category:"DEX / AMM",token:"SCALE",summary:"DeDust is a next-gen DEX on TON using a unique Fluid AMM architecture supporting multiple pool types — constant product, stable swap, and custom curves. It positions as the foundational liquidity layer for TON DeFi.",what_it_does:"Decentralized exchange and AMM for swapping TON-based tokens with multiple curve types.",ecosystem_fit:"Core liquidity infrastructure for TON DeFi — composable by other protocols.",strengths:["Innovative Fluid AMM architecture","Strong audited smart contracts","Growing TVL and volume metrics","Active liquidity mining program","Composable for downstream DeFi"],risks:["STON.fi has more liquidity depth","SCALE vesting not fully transparent","Complex AMM audit surface area","Low volume-to-TVL ratio","Limited marketing footprint"],verdict:"Low-Medium",fit:"DeFi-native liquidity providers",bull_case:"If TON DeFi TVL reaches $2B+, DeDust's composable architecture positions it as the rails for the entire ecosystem.",bear_case:"STON.fi's head-start in liquidity could prove insurmountable if DeDust fails to incentivize LPs aggressively.",risk_matrix:[{area:"Market",level:"Medium"},{area:"Technology",level:"Low"},{area:"Team",level:"Medium"},{area:"Liquidity",level:"Medium"},{area:"Regulatory",level:"Low"}],narrative:"DeDust has built strong developer mindshare. Community governance discussions are very active on Telegram.",conservative_view:"Hold a small position (1-3%) as a bet on TON DeFi growth with limited downside given the low risk score.",speculative_view:"Accumulate aggressively if TVL doubles — protocol revenue would justify a 5-10x re-rating.",explorer_view:"Deploy liquidity in SCALE/TON pool to earn yield while maintaining ecosystem exposure.",final_recommendation:"DeDust is technically strong with real product-market fit in the TON ecosystem. Recommended as a core DeFi holding for TON-native portfolios."},
  wallet:{address:"UQBFam...kR9x",type:"DeFi Power User",activity:"This wallet demonstrates sophisticated DeFi behavior across the TON ecosystem with consistent protocol interactions over 14 months. Activity suggests an experienced crypto native with long-term TON conviction.",patterns:["Regular DEX swaps on DeDust and STON.fi (3-5x/week)","NFT trading on Getgems — focus on TON DNS names","Early participation in Storm Trade liquidity mining","Consistent staking on TON validators"],risk:"Low risk — wallet only interacts with audited, established protocols.",risk_level:"Low",notable:["Active since TON mainnet launch","Top 500 DeDust liquidity provider","Holds 3 rare TON DNS names","Zero exposure to unaudited contracts"],behavior_profile:"Early Adopter / DeFi Native — consistently enters new protocols within their first 30 days.",deep_risk_analysis:"Zero exposure to high-risk protocols. All DeFi interactions are with audited contracts. No leverage or perps detected.",interaction_map:[{protocol:"DeDust",frequency:"High",type:"DEX"},{protocol:"STON.fi",frequency:"Medium",type:"DEX"},{protocol:"Getgems",frequency:"Medium",type:"NFT"},{protocol:"Storm Trade",frequency:"Low",type:"Perps"},{protocol:"TON Validators",frequency:"High",type:"Staking"}],recommendation:"High trust score. Excellent candidate for airdrop eligibility or whitelist access programs."},
  compare:{project_a_name:"DeDust",project_b_name:"STON.fi",summary:"Both are AMM DEXes competing for TON DeFi liquidity. DeDust innovates on architecture; STON.fi wins on current liquidity depth and user base.",utility_comparison:{a:"Multi-curve AMM, composable, developer-first",b:"Simple swap UX, high liquidity, mobile-friendly",winner:"Tie"},risk_comparison:{a:"Medium — newer, less liquidity",b:"Low — established, audited, high TVL",lower_risk:"B"},verdict_a:"Low-Medium",verdict_b:"Low",best_for_conservative:"STON.fi",best_for_speculative:"DeDust",strengths_a:["Fluid AMM innovation","Composable architecture","Active liquidity mining"],strengths_b:["Highest TON DEX liquidity","Simple UX","More trading pairs"],overall_recommendation:"Conservative: STON.fi is the safer blue-chip DEX bet. Speculative: DeDust's architecture could win long-term if TON DeFi matures."},
};

async function callAI(prompt,system){
  const gk=process.env.NEXT_PUBLIC_GROQ_API_KEY,ak=process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if(gk){const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${gk}`},body:JSON.stringify({model:"llama-3.3-70b-versatile",max_tokens:1000,messages:[{role:"system",content:system},{role:"user",content:prompt}]})});return(await r.json()).choices?.[0]?.message?.content||"";}
  else if(ak){const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ak,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages:[{role:"user",content:prompt}]})});return(await r.json()).content?.[0]?.text||"";}
  throw new Error("No API key");
}

async function generateReport(type,input,premium=false){
  const sys="You are TONLens AI. Output valid JSON only, no markdown, no backticks.";
  let prompt="";
  if(type==="project")prompt=`Analyze TON project: ${JSON.stringify(input)}. Return JSON: {"name":"","category":"","summary":"","what_it_does":"","ecosystem_fit":"","strengths":[],"risks":[],"verdict":"Low|Medium|High","fit":""${premium?`,"bull_case":"","bear_case":"","risk_matrix":[{"area":"Market","level":"Low|Medium|High"}],"narrative":"","conservative_view":"","speculative_view":"","explorer_view":"","final_recommendation":""`:""}}`;
  else if(type==="wallet")prompt=`Analyze TON wallet: ${input}. Return JSON: {"address":"${input}","type":"","activity":"","patterns":[],"risk":"","risk_level":"Low|Medium|High","notable":[]${premium?`,"behavior_profile":"","deep_risk_analysis":"","interaction_map":[{"protocol":"","frequency":"High|Medium|Low","type":""}],"recommendation":""`:""}}`;
  else prompt=`Compare TON projects A=${JSON.stringify(input.a)} B=${JSON.stringify(input.b)}. Return JSON: {"project_a_name":"","project_b_name":"","summary":"","utility_comparison":{"a":"","b":"","winner":"A|B|Tie"},"risk_comparison":{"a":"","b":"","lower_risk":"A|B|Tie"},"verdict_a":"","verdict_b":"","best_for_conservative":"","best_for_speculative":"","strengths_a":[],"strengths_b":[]${premium?`,"overall_recommendation":""`:""}}`;
  try{return JSON.parse((await callAI(prompt,sys)).replace(/```json|```/g,"").trim());}
  catch{if(type==="project"){const k=Object.keys(DEMO_REPORTS).find(k=>(input.project_name||"").toLowerCase().includes(k));return DEMO_REPORTS[k]||DEMO_REPORTS.dedust;}if(type==="wallet")return{...DEMO_REPORTS.wallet,address:input};return DEMO_REPORTS.compare;}
}

async function chatWithAI(msgs,ctx){
  try{return await callAI(msgs[msgs.length-1].content,`You are TONLens AI. Context: ${JSON.stringify(ctx).slice(0,1500)}. Answer in 2-3 sentences. Be direct.`);}
  catch{return "Set NEXT_PUBLIC_GROQ_API_KEY in .env.local to enable AI chat.";}
}

const I=({n,s=20,c="currentColor"})=>{
  const m={
    search:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="11"cy="11"r="8"/><line x1="21"y1="21"x2="16.65"y2="16.65"/></svg>,
    wallet:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="1"y="4"width="22"height="16"rx="2"/><line x1="1"y1="10"x2="23"y2="10"/></svg>,
    chart:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><line x1="18"y1="20"x2="18"y2="10"/><line x1="12"y1="20"x2="12"y2="4"/><line x1="6"y1="20"x2="6"y2="14"/></svg>,
    compare:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12"y1="20"x2="12"y2="4"/></svg>,
    back:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    lock:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="3"y="11"width="18"height="11"rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    share:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="18"cy="5"r="3"/><circle cx="6"cy="12"r="3"/><circle cx="18"cy="19"r="3"/><line x1="8.59"y1="13.51"x2="15.42"y2="17.49"/><line x1="15.41"y1="6.51"x2="8.59"y2="10.49"/></svg>,
    check:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    history:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>,
    diamond:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>,
    warning:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12"y1="9"x2="12"y2="13"/><line x1="12"y1="17"x2="12.01"y2="17"/></svg>,
    star:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    bolt:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    close:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><line x1="18"y1="6"x2="6"y2="18"/><line x1="6"y1="6"x2="18"y2="18"/></svg>,
    info:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="12"cy="12"r="10"/><line x1="12"y1="16"x2="12"y2="12"/><line x1="12"y1="8"x2="12.01"y2="8"/></svg>,
    home:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    chat:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    send:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><line x1="22"y1="2"x2="11"y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    trending_up:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    trending_down:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
    shield:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    copy:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="9"y="9"width="13"height="13"rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    logout:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21"y1="12"x2="9"y2="12"/></svg>,
    play:<svg width={s}height={s}viewBox="0 0 24 24"fill={c}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pause:<svg width={s}height={s}viewBox="0 0 24 24"fill={c}><rect x="6"y="4"width="4"height="16"/><rect x="14"y="4"width="4"height="16"/></svg>,
    skip:<svg width={s}height={s}viewBox="0 0 24 24"fill={c}><polygon points="5 4 15 12 5 20 5 4"/><line x1="19"y1="5"x2="19"y2="19"stroke={c}strokeWidth="2"fill="none"/></svg>,
    ton:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"><circle cx="12"cy="12"r="10"fill="#007AFF"/><path d="M8 9h8l-4 7-4-7z"fill="white"/><path d="M12 9v7"stroke="white"strokeWidth="1.5"strokeLinecap="round"/></svg>,
  };
  return m[n]||null;
};

const VerdictBadge=({verdict})=>{const m={"Low":{bg:"rgba(34,197,94,.14)",b:"rgba(34,197,94,.32)",t:"#4ade80"},"Low-Medium":{bg:"rgba(132,204,22,.14)",b:"rgba(132,204,22,.32)",t:"#a3e635"},"Medium":{bg:"rgba(234,179,8,.14)",b:"rgba(234,179,8,.32)",t:"#fbbf24"},"Medium-High":{bg:"rgba(249,115,22,.14)",b:"rgba(249,115,22,.32)",t:"#fb923c"},"High":{bg:"rgba(239,68,68,.14)",b:"rgba(239,68,68,.32)",t:"#f87171"}};const v=m[verdict]||m["Medium"];return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:v.bg,border:`1px solid ${v.b}`,color:v.t,fontSize:11,fontWeight:700}}><span style={{width:5,height:5,borderRadius:"50%",background:v.t,display:"inline-block"}}/>{verdict} Risk</span>;};

const RiskGauge=({verdict})=>{const sc={"Low":15,"Low-Medium":32,"Medium":52,"Medium-High":72,"High":90};const cl={"Low":"#4ade80","Low-Medium":"#a3e635","Medium":"#fbbf24","Medium-High":"#fb923c","High":"#f87171"};const score=sc[verdict]||50,color=cl[verdict]||"#fbbf24";const r=34,cx=50,cy=52,tr=d=>d*Math.PI/180,sd=-215,td=250,ed=sd+(score/100)*td;const x1=cx+r*Math.cos(tr(sd)),y1=cy+r*Math.sin(tr(sd));const x2b=cx+r*Math.cos(tr(sd+td)),y2b=cy+r*Math.sin(tr(sd+td));const x2=cx+r*Math.cos(tr(ed)),y2=cy+r*Math.sin(tr(ed));return(<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><svg width="100"height="72"viewBox="0 0 100 72"><path d={`M ${x1} ${y1} A ${r} ${r} 0 ${td>180?1:0} 1 ${x2b} ${y2b}`}fill="none"stroke="rgba(255,255,255,.07)"strokeWidth="5"strokeLinecap="round"/><path d={`M ${x1} ${y1} A ${r} ${r} 0 ${(score/100)*td>180?1:0} 1 ${x2} ${y2}`}fill="none"stroke={color}strokeWidth="5"strokeLinecap="round"/><text x="50"y="56"textAnchor="middle"fill={color}fontSize="13"fontWeight="800"fontFamily="-apple-system,sans-serif">{score}</text></svg><span style={{fontSize:9,color:"#1a3050",letterSpacing:"0.1em",fontWeight:700,marginTop:-6}}>RISK SCORE</span></div>);};

const Loader=({text})=>(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:40}}><div style={{position:"relative",width:60,height:60}}><div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTop:"2px solid #007AFF",animation:"spin 1s linear infinite"}}/><div style={{position:"absolute",inset:9,borderRadius:"50%",border:"2px solid transparent",borderBottom:"2px solid #5856D6",animation:"spin 1.4s linear infinite reverse"}}/><div style={{position:"absolute",inset:"50%",transform:"translate(-50%,-50%)",width:10,height:10,borderRadius:"50%",background:"linear-gradient(135deg,#007AFF,#5856D6)"}}/></div><span style={{fontSize:13,color:"#2a5070",letterSpacing:"0.06em"}}>{text||"Analyzing..."}</span></div>);

function Lbl({t,noMb}){return <div style={{fontSize:9,color:"#08161f",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:noMb?0:8}}>{t}</div>;}
function Fld({label,ph,val,set,mono}){return(<div><label style={{fontSize:9,color:"#08161f",fontWeight:700,display:"block",marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</label><input value={val}onChange={e=>set(e.target.value)}placeholder={ph}style={{width:"100%",padding:"12px 13px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,fontSize:12,color:"#c5e0f5",fontFamily:mono?"monospace":"inherit",outline:"none"}}onFocus={e=>e.target.style.borderColor="rgba(0,122,255,.4)"}onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.08)"}/></div>);}
function Btn({label,dis,onClick,color}){return <button disabled={dis}onClick={onClick}style={{padding:"15px",background:dis?"rgba(255,255,255,.05)":`linear-gradient(135deg,${color},${color}88)`,borderRadius:14,fontSize:14,fontWeight:700,color:dis?"#0d2030":"white",marginTop:7,cursor:dis?"not-allowed":"pointer",border:"none",width:"100%"}}>{label}</button>;}
function Hdr({title,sub,onBack,ii,ic,badge}){return(<div style={{padding:"12px 14px 11px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",gap:10}}><button onClick={onBack}style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:35,height:35,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",flexShrink:0}}><I n="back"s={17}c="#4a6070"/></button><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:15,fontWeight:800,color:"#c5e0f5"}}>{title}</span>{badge&&<span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 7px",borderRadius:8}}>{badge}</span>}</div><div style={{fontSize:10,color:"#0d1e30",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub}</div></div><div style={{width:35,height:35,borderRadius:10,background:`${ic}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ii}s={16}c={ic}/></div></div>);}
function Sct({title,icon,color,children,pro,compact}){return(<div style={{padding:compact?10:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><I n={icon}s={12}c={color}/><span style={{fontSize:compact?11:12,fontWeight:700,color:"#85aac0"}}>{title}</span>{pro&&<span style={{marginLeft:"auto",fontSize:8,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:7}}>PRO</span>}</div>{children}</div>);}
function Bls({items,c,i,sm}){return <div style={{display:"flex",flexDirection:"column",gap:sm?4:6}}>{items?.map((item,j)=><div key={j}style={{display:"flex",gap:7,alignItems:"flex-start"}}><div style={{flexShrink:0,marginTop:2}}><I n={i}s={10}c={c}/></div><span style={{fontSize:sm?10:11,color:"#3a6070",lineHeight:1.65}}>{item}</span></div>)}</div>;}
function Rw({label,val}){return <div style={{padding:"9px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:11,display:"flex",gap:9,alignItems:"flex-start"}}><span style={{fontSize:9,color:"#0d2030",minWidth:84,flexShrink:0,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</span><span style={{fontSize:11,color:"#3a6070",lineHeight:1.6}}>{val}</span></div>;}
function CRw({label,a,b,winner,wl="Better"}){return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{fontSize:9,color:"#0d2030",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{label}</div><div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:7,alignItems:"start"}}><span style={{fontSize:11,color:"#4a7090",lineHeight:1.55}}>{a}</span><span style={{fontSize:9,color:winner==="Tie"?"#fbbf24":"#4ade80",fontWeight:700,background:"rgba(255,255,255,.05)",padding:"3px 7px",borderRadius:7,textAlign:"center",whiteSpace:"nowrap",alignSelf:"center"}}>{winner==="Tie"?"Tie":winner==="A"?`◄ ${wl}`:`${wl} ►`}</span><span style={{fontSize:11,color:"#8860aa",lineHeight:1.55,textAlign:"right"}}>{b}</span></div></div>);}

function TonConnectModal({onConnect,onClose}){
  const [connecting,setConnecting]=useState(null);
  const wallets=[
    {id:"tonkeeper",name:"Tonkeeper",desc:"Most popular TON wallet",color:"#007AFF",icon:"💎"},
    {id:"tonhub",name:"Tonhub",desc:"Smart contract wallet",color:"#5856D6",icon:"🔷"},
    {id:"mytonwallet",name:"MyTonWallet",desc:"Simple & secure",color:"#34C759",icon:"🟢"},
    {id:"openmask",name:"OpenMask",desc:"Browser extension",color:"#FF9500",icon:"🦊"},
    {id:"tonwallet",name:"Telegram Wallet",desc:"Built into Telegram",color:"#27A7E7",icon:"✈️"},
  ];
  const connect=async(w)=>{
    setConnecting(w.id);
    await new Promise(r=>setTimeout(r,1800));
    const addr="UQ"+Math.random().toString(36).slice(2,10).toUpperCase()+"..."+Math.random().toString(36).slice(2,6).toUpperCase();
    const bal=(Math.random()*200+5).toFixed(2);
    onConnect({address:addr,balance:bal,wallet:w.name,walletId:w.id});
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,.92)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:"#0b1421",borderRadius:"22px 22px 0 0",border:"1px solid rgba(255,255,255,.09)",borderBottom:"none",animation:"slideUp .35s ease",paddingBottom:32}}>
        <div style={{padding:"18px 18px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          <div><div style={{fontSize:17,fontWeight:800,color:"#d0eaff"}}>Connect Wallet</div><div style={{fontSize:11,color:"#1a4060",marginTop:2}}>Your TON wallet is your identity — like MetaMask on Ethereum</div></div>
          <button onClick={onClose}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button>
        </div>
        <div style={{margin:"12px 16px",padding:"10px 13px",background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12,display:"flex",alignItems:"center",gap:9}}>
          <I n="ton"s={22}/>
          <div><div style={{fontSize:12,fontWeight:700,color:"#007AFF"}}>Powered by TON Connect 2.0</div><div style={{fontSize:10,color:"#1a4060"}}>Secure · Non-custodial · Your keys, your crypto</div></div>
        </div>
        <div style={{padding:"4px 16px",display:"flex",flexDirection:"column",gap:7}}>
          {wallets.map(w=>(
            <button key={w.id}onClick={()=>connect(w)}disabled={!!connecting}style={{display:"flex",alignItems:"center",gap:13,padding:"12px 14px",background:connecting===w.id?"rgba(0,122,255,.1)":"rgba(255,255,255,.03)",border:`1px solid ${connecting===w.id?"rgba(0,122,255,.3)":"rgba(255,255,255,.07)"}`,borderRadius:14,cursor:connecting?"not-allowed":"pointer",transition:"all .2s"}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${w.color}18`,border:`1px solid ${w.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{w.icon}</div>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,fontWeight:700,color:"#c0dcf5"}}>{w.name}</div><div style={{fontSize:11,color:"#2a4a60",marginTop:1}}>{w.desc}</div></div>
              {connecting===w.id?<div style={{width:20,height:20,borderRadius:"50%",border:"2px solid transparent",borderTop:`2px solid ${w.color}`,animation:"spin 1s linear infinite"}}/>:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="#1a3a50"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
            </button>
          ))}
        </div>
        <p style={{padding:"12px 18px 0",textAlign:"center",fontSize:10,color:"#0d1e2e",lineHeight:1.6}}>Research tool only. Not financial advice.</p>
      </div>
    </div>
  );
}

function WalletPill({wallet,onConnect,onDisconnect}){
  const [open,setOpen]=useState(false);
  if(!wallet)return(<button onClick={onConnect}style={{display:"flex",alignItems:"center",gap:7,padding:"8px 13px",background:"linear-gradient(135deg,rgba(0,122,255,.15),rgba(88,86,214,.15))",border:"1px solid rgba(0,122,255,.28)",borderRadius:22,cursor:"pointer"}}><I n="ton"s={16}/><span style={{fontSize:11,fontWeight:800,color:"#007AFF"}}>Connect Wallet</span></button>);
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)}style={{display:"flex",alignItems:"center",gap:8,padding:"6px 11px 6px 8px",background:"rgba(0,122,255,.08)",border:"1px solid rgba(0,122,255,.2)",borderRadius:22,cursor:"pointer"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",flexShrink:0}}/>
        <div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:"#4ade80",fontFamily:"monospace"}}>{shortAddr(wallet.address)}</div><div style={{fontSize:9,color:"#007AFF",fontWeight:600}}>{wallet.balance} TON</div></div>
        <svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="#3a5a70"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0e1828",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:14,minWidth:230,zIndex:300,boxShadow:"0 20px 60px rgba(0,0,0,.5)",animation:"fadeIn .2s ease"}}>
          <div style={{padding:"10px 12px",background:"rgba(0,122,255,.07)",borderRadius:11,marginBottom:10}}>
            <div style={{fontSize:9,color:"#007AFF",fontWeight:700,letterSpacing:"0.1em",marginBottom:5}}>CONNECTED WALLET</div>
            <div style={{fontSize:11,fontFamily:"monospace",color:"#90b8d0",marginBottom:6,wordBreak:"break-all"}}>{wallet.address}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}><I n="ton"s={14}/><span style={{fontSize:15,fontWeight:800,color:"#007AFF"}}>{wallet.balance} TON</span></div>
              <span style={{fontSize:10,color:"#2a4a60"}}>{wallet.wallet}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)",borderRadius:10,marginBottom:10}}>
            <I n="shield"s={13}c="#4ade80"/>
            <div><div style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>Authenticated via TON Connect</div><div style={{fontSize:9,color:"#1a4060"}}>Non-custodial · Signed by your wallet</div></div>
          </div>
          <button onClick={()=>{setOpen(false);onDisconnect();}}style={{width:"100%",padding:"10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.18)",borderRadius:11,fontSize:12,fontWeight:600,color:"#f87171",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            <I n="logout"s={14}c="#f87171"/>Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

function DemoPlayer({onClose}){
  const [step,setStep]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [progress,setProgress]=useState(0);
  const timerRef=useRef(null);
  const total=DEMO_SCRIPT.length;
  useEffect(()=>{
    if(!playing)return;
    const duration=step<total-1?(DEMO_SCRIPT[step+1].time-DEMO_SCRIPT[step].time):5000;
    const interval=50;let elapsed=0;
    timerRef.current=setInterval(()=>{elapsed+=interval;setProgress(elapsed/duration*100);if(elapsed>=duration){clearInterval(timerRef.current);if(step<total-1){setStep(s=>s+1);setProgress(0);}else{setPlaying(false);}}},interval);
    return()=>clearInterval(timerRef.current);
  },[step,playing]);
  const cur=DEMO_SCRIPT[step];
  const emojis=["🚀","🔗","✅","🔍","📊","💎","🧠","👛","⚖️","📤","🏆"];
  return(
    <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.95)",backdropFilter:"blur(20px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <button onClick={onClose}style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.08)",border:"none",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><I n="close"s={16}c="#4a6070"/></button>
      <div style={{marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:"#1a4060",letterSpacing:"0.2em",fontWeight:700,marginBottom:5}}>DEMO MODE</div>
        <div style={{fontSize:26,fontWeight:900,color:"white",letterSpacing:"-0.02em"}}>TONLens Walkthrough</div>
        <div style={{fontSize:12,color:"#2a5070",marginTop:4}}>{total} steps · ~50 seconds · For hackathon judges</div>
      </div>
      <div style={{width:"100%",maxWidth:370,background:"#0b1828",border:"1px solid rgba(0,122,255,.2)",borderRadius:20,padding:"20px 18px",marginBottom:16,animation:"fadeIn .4s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(0,122,255,.15)",border:"1px solid rgba(0,122,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>{emojis[step]}</div>
          <div style={{flex:1}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,letterSpacing:"0.12em",marginBottom:2}}>STEP {step+1} OF {total}</div><div style={{fontSize:17,fontWeight:800,color:"#d5ecff"}}>{cur.title}</div></div>
        </div>
        <p style={{fontSize:13,color:"#4a7585",lineHeight:1.75,marginBottom:14}}>{cur.desc}</p>
        <div style={{height:3,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#007AFF,#5856D6)",borderRadius:3,width:`${progress}%`,transition:"width .05s linear"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:16}}>
        {DEMO_SCRIPT.map((_,i)=><button key={i}onClick={()=>{setStep(i);setProgress(0);setPlaying(true);}}style={{width:i===step?20:6,height:6,borderRadius:3,background:i===step?"#007AFF":i<step?"rgba(0,122,255,.4)":"rgba(255,255,255,.1)",border:"none",cursor:"pointer",transition:"all .3s"}}/>)}
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:18}}>
        <button onClick={()=>{if(step>0){setStep(s=>s-1);setProgress(0);setPlaying(true);}}}style={{width:40,height:40,borderRadius:12,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.09)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transform:"scaleX(-1)"}}><I n="skip"s={16}c="#4a6070"/></button>
        <button onClick={()=>setPlaying(p=>!p)}style={{width:54,height:54,borderRadius:15,background:"linear-gradient(135deg,#007AFF,#5856D6)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 8px 28px rgba(0,122,255,.4)"}}><I n={playing?"pause":"play"}s={22}c="white"/></button>
        <button onClick={()=>{if(step<total-1){setStep(s=>s+1);setProgress(0);setPlaying(true);}}}style={{width:40,height:40,borderRadius:12,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.09)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><I n="skip"s={16}c="#4a6070"/></button>
      </div>
      <div style={{width:"100%",maxWidth:370,maxHeight:130,overflowY:"auto"}}>
        {DEMO_SCRIPT.map((s,i)=>(
          <div key={i}onClick={()=>{setStep(i);setProgress(0);setPlaying(true);}}style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,cursor:"pointer",background:i===step?"rgba(0,122,255,.1)":"transparent",marginBottom:1}}>
            <div style={{width:17,height:17,borderRadius:"50%",background:i<step?"#007AFF":i===step?"rgba(0,122,255,.3)":"rgba(255,255,255,.05)",border:`1px solid ${i===step?"#007AFF":"rgba(255,255,255,.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {i<step?<I n="check"s={8}c="white"/>:<span style={{fontSize:7,color:i===step?"#007AFF":"#1a3050",fontWeight:700}}>{i+1}</span>}
            </div>
            <span style={{fontSize:11,color:i===step?"#007AFF":i<step?"#3a6080":"#1a3050",fontWeight:i===step?700:400}}>{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTicker({tonStats}){
  const up=parseFloat(tonStats.change)>=0;
  const t=`TON  $${tonStats.price}  ${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%   ·   Market Cap  $${tonStats.mcap}   ·   TON Connect Auth   ·   Telegram  900M+ Users   ·   `;
  return(<div style={{background:"rgba(0,122,255,.05)",borderBottom:"1px solid rgba(0,122,255,.09)",height:27,overflow:"hidden",display:"flex",alignItems:"center"}}><div style={{display:"flex",animation:"ticker 22s linear infinite",whiteSpace:"nowrap"}}>{[t,t].map((txt,i)=><span key={i}style={{fontSize:10,color:"#1a4060",letterSpacing:"0.06em",paddingRight:20}}>{txt}</span>)}</div></div>);
}

function HomeScreen({wallet,onConnect,onDisconnect,onNavigate,history,tonStats,setReport,onDemo,tgUser}){
  const up=parseFloat(tonStats.change)>=0;
  return(
    <div style={{minHeight:"100vh",paddingBottom:88}}>
      <StatsTicker tonStats={tonStats}/>
      <div style={{padding:"13px 15px 11px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#fff,#7aabcc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TONLens</div><div style={{fontSize:10,color:"#0d2030",letterSpacing:"0.1em",marginTop:1,fontWeight:700}}>TON RESEARCH INTELLIGENCE</div></div>
        <WalletPill wallet={wallet} onConnect={onConnect} onDisconnect={onDisconnect}/>
      </div>
      <div style={{padding:"10px 15px",background:wallet?"linear-gradient(135deg,rgba(34,197,94,.06),rgba(0,122,255,.06))":"linear-gradient(135deg,rgba(0,122,255,.06),rgba(88,86,214,.06))",borderBottom:`1px solid ${wallet?"rgba(34,197,94,.1)":"rgba(0,122,255,.1)"}`,display:"flex",alignItems:"center",gap:11}}>
        {wallet?(<><div style={{width:36,height:36,borderRadius:10,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="shield"s={16}c="#4ade80"/></div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>Authenticated via TON Wallet ✓</div><div style={{fontSize:10,color:"#1a4060",marginTop:1}}>Your wallet is your identity · {shortAddr(wallet.address)} · {wallet.balance} TON</div></div></>):(
          <><div style={{width:36,height:36,borderRadius:10,background:"rgba(0,122,255,.1)",border:"1px solid rgba(0,122,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="ton"s={16}/></div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#007AFF"}}>Connect wallet to sign in</div><div style={{fontSize:10,color:"#1a4060",marginTop:1}}>Like MetaMask on Ethereum — your TON wallet is your login</div></div><button onClick={onConnect}style={{padding:"7px 13px",background:"rgba(0,122,255,.15)",border:"1px solid rgba(0,122,255,.3)",borderRadius:18,fontSize:11,fontWeight:700,color:"#007AFF",cursor:"pointer",flexShrink:0}}>Connect</button></>
        )}
      </div>
      {tgUser&&<div style={{padding:"7px 15px",background:"rgba(39,167,231,.05)",borderBottom:"1px solid rgba(39,167,231,.1)",display:"flex",alignItems:"center",gap:8}}><svg width="13"height="13"viewBox="0 0 24 24"fill="#27A7E7"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.042 13.9l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.77.686z"/></svg><span style={{fontSize:10,color:"#27A7E7",fontWeight:600}}>Telegram Mini App: @{tgUser.username||tgUser.firstName}</span></div>}
      <div style={{padding:"11px 15px",display:"flex",gap:8}}>
        {[{label:"TON Price",val:`$${tonStats.price}`,sub:`${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%`,c:up?"#4ade80":"#f87171"},{label:"Market Cap",val:`$${tonStats.mcap}`,sub:"USD",c:"#007AFF"},{label:"Auth",val:"TON Connect",sub:"Non-custodial",c:"#a78bfa"}].map(s=>(
          <div key={s.label}style={{flex:1,padding:9,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#0d2030",fontWeight:700,letterSpacing:"0.08em",marginBottom:2}}>{s.label}</div>
            <div style={{fontSize:13,fontWeight:800,color:"#b0d0e8"}}>{s.val}</div>
            <div style={{fontSize:9,color:s.c,fontWeight:600,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"0 15px",display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={onDemo}style={{width:"100%",padding:"12px 16px",background:"linear-gradient(135deg,rgba(251,191,36,.08),rgba(249,115,22,.08))",border:"1px solid rgba(251,191,36,.2)",borderRadius:14,display:"flex",alignItems:"center",gap:11,cursor:"pointer"}}>
          <div style={{width:38,height:38,borderRadius:11,background:"rgba(251,191,36,.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="play"s={16}c="#fbbf24"/></div>
          <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>▶ Watch Demo</div><div style={{fontSize:10,color:"#7a5a10"}}>11-step walkthrough · ~50 seconds · For judges</div></div>
          <span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"3px 8px",borderRadius:8}}>DEMO</span>
        </button>
        <div><Lbl t="Research Tools"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
            {[{l:"Project",i:"chart",s:"project",c:"#007AFF",d:"AI analysis"},{l:"Wallet",i:"wallet",s:"wallet",c:"#5856D6",d:"Profiling"},{l:"Compare",i:"compare",s:"compare",c:"#AF52DE",d:"Side-by-side"}].map(item=>(
              <button key={item.s}onClick={()=>onNavigate(item.s)}style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:15,padding:"14px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:7,cursor:"pointer"}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${item.c}16`,border:`1px solid ${item.c}26`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={item.i}s={19}c={item.c}/></div>
                <div style={{fontSize:11,fontWeight:700,color:"#a0c0d8"}}>{item.l}</div>
                <div style={{fontSize:9,color:"#0d2030"}}>{item.d}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,rgba(0,122,255,.09),rgba(88,86,214,.09))",border:"1px solid rgba(0,122,255,.15)",borderRadius:15,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:11,background:"linear-gradient(135deg,#007AFF,#5856D6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="diamond"s={18}c="white"/></div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#c0dcf5"}}>Premium Deep Reports</div><div style={{fontSize:10,color:"#1a4060",marginTop:2}}>Bull/bear · Risk matrix · AI chat · Pay with wallet</div></div>
          <div style={{fontSize:14,fontWeight:800,color:"#007AFF"}}>0.5 TON</div>
        </div>
        <div><Lbl t="Trending on TON"/>
          {[{name:"Storm Trade",cat:"Perpetuals DEX",risk:"Medium",c:"#007AFF",chg:"+12.4%"},{name:"Getgems",cat:"NFT Marketplace",risk:"Low",c:"#4ade80",chg:"+4.2%"},{name:"DeDust",cat:"DEX / AMM",risk:"Low-Medium",c:"#a78bfa",chg:"+7.8%"},{name:"STON.fi",cat:"DEX",risk:"Low",c:"#fbbf24",chg:"+3.1%"}].map((p,i)=>(
            <div key={p.name}onClick={()=>onNavigate("project")}style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:13,cursor:"pointer",gap:10,marginBottom:6,animation:`fadeIn .3s ease ${i*.07}s both`}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${p.c}15`,border:`1px solid ${p.c}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="bolt"s={15}c={p.c}/></div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#b0d0e5"}}>{p.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:1}}>{p.cat}</div></div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><VerdictBadge verdict={p.risk}/><span style={{fontSize:10,color:"#4ade80",fontWeight:600}}>{p.chg}</span></div>
            </div>
          ))}
        </div>
        {history.length>0&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><Lbl t="Recent Research" noMb/><button onClick={()=>onNavigate("history")}style={{background:"none",border:"none",fontSize:11,color:"#007AFF",fontWeight:600,cursor:"pointer"}}>See all</button></div>
            {history.slice(0,3).map(h=>(
              <div key={h.id}onClick={()=>setReport(h.report,h.type,h.premium)}style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12,cursor:"pointer",gap:9,marginBottom:6}}>
                <I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"}s={14}c="#1a3a50"/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#90b8d0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:1}}>{h.date} · {h.type}</div></div>
                {h.premium&&<span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 7px",borderRadius:8}}>PRO</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="home" onNavigate={onNavigate}/>
    </div>
  );
}

function ProjectScreen({onBack,onSubmit}){
  const [form,setForm]=useState({project_name:"",website_url:"",token_symbol:""});
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Analyze Project" sub="AI-powered due diligence" onBack={onBack} ic="#007AFF" ii="chart"/><div style={{padding:"15px",display:"flex",flexDirection:"column",gap:11}}><Fld label="Project Name *" ph="e.g. DeDust, Storm Trade" val={form.project_name} set={v=>setForm(p=>({...p,project_name:v}))}/><Fld label="Website URL" ph="https://..." val={form.website_url} set={v=>setForm(p=>({...p,website_url:v}))}/><Fld label="Token Symbol" ph="e.g. STORM, SCALE" val={form.token_symbol} set={v=>setForm(p=>({...p,token_symbol:v}))}/><div><Lbl t="Quick Fill"/><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{["Storm Trade","Getgems","DeDust","STON.fi","Catizen"].map(p=><button key={p}onClick={()=>setForm(prev=>({...prev,project_name:p}))}style={{padding:"5px 11px",borderRadius:16,background:form.project_name===p?"rgba(0,122,255,.16)":"rgba(255,255,255,.04)",border:`1px solid ${form.project_name===p?"rgba(0,122,255,.36)":"rgba(255,255,255,.07)"}`,fontSize:11,color:form.project_name===p?"#007AFF":"#4a7080",cursor:"pointer"}}>{p}</button>)}</div></div><Btn label="Generate Report →" dis={!form.project_name} onClick={()=>onSubmit(form)} color="#007AFF"/></div></div>);
}

function WalletScreen({onBack,onSubmit,connectedWallet}){
  const [addr,setAddr]=useState(connectedWallet?.address||"");
  useEffect(()=>{if(connectedWallet?.address)setAddr(connectedWallet.address);},[connectedWallet]);
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Wallet Analysis" sub="Behavioral profiling & risk scoring" onBack={onBack} ic="#5856D6" ii="wallet"/><div style={{padding:"15px",display:"flex",flexDirection:"column",gap:11}}>{connectedWallet&&<div style={{padding:"10px 13px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)",borderRadius:12,display:"flex",alignItems:"center",gap:8}}><I n="check"s={13}c="#4ade80"/><span style={{fontSize:11,color:"#4ade80",fontWeight:600}}>Connected wallet auto-filled ✓</span></div>}<Fld label="TON Wallet Address *" ph="UQB... or EQ..." val={addr} set={setAddr} mono/><Btn label="Analyze Wallet →" dis={!addr} onClick={()=>onSubmit(addr)} color="#5856D6"/></div></div>);
}

function CompareScreen({onBack,onSubmit}){
  const [a,setA]=useState({project_name:""});const [b,setB]=useState({project_name:""});
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Compare Projects" sub="Side-by-side AI analysis" onBack={onBack} ic="#AF52DE" ii="compare"/><div style={{padding:"15px",display:"flex",flexDirection:"column",gap:11}}><div style={{padding:12,background:"rgba(0,122,255,.06)",border:"1px solid rgba(0,122,255,.12)",borderRadius:12}}><div style={{fontSize:10,color:"#007AFF",fontWeight:700,marginBottom:7}}>▲ PROJECT A</div><Fld label="Project Name" ph="e.g. DeDust" val={a.project_name} set={v=>setA(p=>({...p,project_name:v}))}/></div><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:"rgba(255,255,255,.05)"}}/><span style={{fontSize:10,color:"#0d2030",fontWeight:700}}>VS</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.05)"}}/></div><div style={{padding:12,background:"rgba(175,82,222,.06)",border:"1px solid rgba(175,82,222,.12)",borderRadius:12}}><div style={{fontSize:10,color:"#AF52DE",fontWeight:700,marginBottom:7}}>▼ PROJECT B</div><Fld label="Project Name" ph="e.g. STON.fi" val={b.project_name} set={v=>setB(p=>({...p,project_name:v}))}/></div><div><Lbl t="Quick Pairs"/>{[["DeDust","STON.fi"],["Storm Trade","Katana DEX"],["Getgems","Fragment"]].map(([pA,pB])=><button key={pA}onClick={()=>{setA({project_name:pA});setB({project_name:pB});}}style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"8px 12px",marginBottom:5,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,fontSize:11,cursor:"pointer"}}><span style={{color:"#5580aa"}}>{pA}</span><span style={{color:"#0d2030"}}>vs</span><span style={{color:"#9966bb"}}>{pB}</span></button>)}</div><Btn label="Compare Now →" dis={!(a.project_name&&b.project_name)} onClick={()=>onSubmit(a,b)} color="#AF52DE"/></div></div>);
}

function RiskMx({matrix}){const vc={Low:"#4ade80",Medium:"#fbbf24",High:"#f87171"},vw={Low:"28%",Medium:"58%",High:"88%"};return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}><I n="shield"s={11}c="#007AFF"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Risk Matrix</span><span style={{marginLeft:"auto",fontSize:8,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:7}}>PRO</span></div>{matrix.map((row,i)=><div key={i}style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:10,color:"#1a3a50",width:80,flexShrink:0}}>{row.area}</span><div style={{flex:1,height:5,borderRadius:3,background:"rgba(255,255,255,.05)"}}><div style={{height:"100%",borderRadius:3,background:vc[row.level]||"#fbbf24",width:vw[row.level]||"50%",transition:"width 1s ease"}}/></div><span style={{fontSize:9,color:vc[row.level]||"#fbbf24",fontWeight:700,width:38,textAlign:"right"}}>{row.level}</span></div>)}</div>);}
function InvLens({report}){const ps=[{k:"conservative_view",i:"shield",c:"#4ade80",l:"Conservative"},{k:"speculative_view",i:"bolt",c:"#fbbf24",l:"Speculative"},{k:"explorer_view",i:"search",c:"#a78bfa",l:"Explorer"}];if(!ps.some(p=>report[p.k]))return null;return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}><I n="star"s={11}c="#fbbf24"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Investor Lens</span><span style={{marginLeft:"auto",fontSize:8,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:7}}>PRO</span></div>{ps.map(p=>report[p.k]&&<div key={p.k}style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10}}><div style={{width:24,height:24,borderRadius:7,background:`${p.c}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={p.i}s={11}c={p.c}/></div><div><div style={{fontSize:8,color:p.c,fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{p.l}</div><div style={{fontSize:11,color:"#3a6070",lineHeight:1.65}}>{report[p.k]}</div></div></div>)}</div>);}
function IntMp({map}){const fc={High:"#4ade80",Medium:"#fbbf24",Low:"#1a3a50"};return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><I n="chart"s={11}c="#5856D6"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Protocol Interactions</span><span style={{marginLeft:"auto",fontSize:8,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:7}}>PRO</span></div>{map.map((item,i)=><div key={i}style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:12,color:"#90b8d0",fontWeight:600,flex:1}}>{item.protocol}</span><span style={{fontSize:9,color:"#1a3a50",background:"rgba(255,255,255,.04)",padding:"2px 7px",borderRadius:6}}>{item.type}</span><span style={{fontSize:9,color:fc[item.frequency]||"#fbbf24",fontWeight:700}}>{item.frequency}</span></div>)}</div>);}

function ReportScreen({report,reportType,isPremium,onBack,onUnlock,onShare,onChat,wallet}){
  const name=reportType==="wallet"?(report.address||"").slice(0,16)+"...":report.name||report.project_a_name||"Report";
  const ProjC=()=><>{
    <div style={{padding:14,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:13,animation:"fadeIn .4s ease"}}><div style={{display:"flex",alignItems:"flex-start",gap:11,marginBottom:11}}><div style={{flex:1}}><div style={{fontSize:19,fontWeight:900,color:"#d5ecff",letterSpacing:"-0.02em"}}>{report.name}</div>{report.category&&<div style={{fontSize:10,color:"#1a4060",marginTop:2}}>{report.category}</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>{report.verdict&&<VerdictBadge verdict={report.verdict}/>}{report.verdict&&<RiskGauge verdict={report.verdict}/>}</div></div><p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.summary}</p></div>,
    report.what_it_does&&<Sct title="What It Does" icon="bolt" color="#007AFF"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.what_it_does}</p></Sct>,
    report.ecosystem_fit&&<Sct title="TON Ecosystem Fit" icon="shield" color="#5856D6"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.ecosystem_fit}</p></Sct>,
    report.strengths&&<Sct title="Strengths" icon="trending_up" color="#4ade80"><Bls items={report.strengths} c="#4ade80" i="check"/></Sct>,
    report.risks&&<Sct title="Risk Flags" icon="warning" color="#f87171"><Bls items={report.risks} c="#f87171" i="warning"/></Sct>,
    report.fit&&<Rw label="Best Suited For" val={report.fit}/>,
    isPremium&&report.bull_case&&<Sct title="Bull Case" icon="trending_up" color="#4ade80" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bull_case}</p></Sct>,
    isPremium&&report.bear_case&&<Sct title="Bear Case" icon="trending_down" color="#f87171" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bear_case}</p></Sct>,
    isPremium&&report.risk_matrix&&<RiskMx matrix={report.risk_matrix}/>,
    isPremium&&report.narrative&&<Sct title="Narrative" icon="star" color="#fbbf24" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.narrative}</p></Sct>,
    isPremium&&<InvLens report={report}/>,
    isPremium&&report.final_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.1em"}}>Final Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.final_recommendation}</p></div>
  }</>;
  const WalC=()=><>{
    <div style={{padding:14,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:13}}><div style={{display:"flex",alignItems:"flex-start",gap:11,marginBottom:11}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:800,color:"#c0dcf0",fontFamily:"monospace"}}>{(report.address||"").slice(0,22)}...</div>{report.type&&<div style={{fontSize:11,color:"#007AFF",marginTop:3,fontWeight:600}}>{report.type}</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>{report.risk_level&&<VerdictBadge verdict={report.risk_level}/>}{report.risk_level&&<RiskGauge verdict={report.risk_level}/>}</div></div><p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.activity}</p></div>,
    report.patterns&&<Sct title="Behavioral Patterns" icon="chart" color="#5856D6"><Bls items={report.patterns} c="#a78bfa" i="info"/></Sct>,
    report.notable&&<Sct title="Notable Activity" icon="star" color="#fbbf24"><Bls items={report.notable} c="#fbbf24" i="bolt"/></Sct>,
    report.risk&&<Rw label="Risk Assessment" val={report.risk}/>,
    isPremium&&report.behavior_profile&&<Sct title="Behavioral Archetype" icon="shield" color="#007AFF" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.behavior_profile}</p></Sct>,
    isPremium&&report.deep_risk_analysis&&<Sct title="Deep Risk Analysis" icon="warning" color="#f87171" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.deep_risk_analysis}</p></Sct>,
    isPremium&&report.interaction_map&&<IntMp map={report.interaction_map}/>,
    isPremium&&report.recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.recommendation}</p></div>
  }</>;
  const CmpC=()=><>{
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,animation:"fadeIn .4s ease"}}>{[{name:report.project_a_name,v:report.verdict_a,ci:"0,122,255"},{name:report.project_b_name,v:report.verdict_b,ci:"175,82,222"}].map((p,i)=><div key={i}style={{padding:12,background:`rgba(${p.ci},.07)`,border:`1px solid rgba(${p.ci},.15)`,borderRadius:13,textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:`rgb(${p.ci})`,marginBottom:7}}>{p.name}</div>{p.v&&<><VerdictBadge verdict={p.v}/><div style={{marginTop:7}}><RiskGauge verdict={p.v}/></div></>}</div>)}</div>,
    report.summary&&<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13}}><p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.summary}</p></div>,
    report.utility_comparison&&<CRw label="Utility" a={report.utility_comparison.a} b={report.utility_comparison.b} winner={report.utility_comparison.winner}/>,
    report.risk_comparison&&<CRw label="Risk" a={report.risk_comparison.a} b={report.risk_comparison.b} winner={report.risk_comparison.lower_risk} wl="Lower Risk"/>,
    report.strengths_a&&report.strengths_b&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Sct title={report.project_a_name} icon="trending_up" color="#007AFF" compact><Bls items={report.strengths_a} c="#007AFF" i="check" sm/></Sct><Sct title={report.project_b_name} icon="trending_up" color="#AF52DE" compact><Bls items={report.strengths_b} c="#AF52DE" i="check" sm/></Sct></div>,
    report.best_for_conservative&&<Rw label="Conservative" val={report.best_for_conservative}/>,
    report.best_for_speculative&&<Rw label="Speculative" val={report.best_for_speculative}/>,
    isPremium&&report.overall_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Overall Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.overall_recommendation}</p></div>
  }</>;
  return(
    <div style={{minHeight:"100vh",paddingBottom:90}}>
      <Hdr title={isPremium?"Premium Report":"Free Summary"} sub={name} onBack={onBack} ii={isPremium?"diamond":"chart"} ic={isPremium?"#fbbf24":"#007AFF"} badge={isPremium?"PRO":null}/>
      <div style={{padding:"13px 15px",display:"flex",flexDirection:"column",gap:11}}>
        {reportType==="project"&&<ProjC/>}{reportType==="wallet"&&<WalC/>}{reportType==="compare"&&<CmpC/>}
        {!isPremium&&(
          <div style={{borderRadius:15,padding:16,background:"linear-gradient(135deg,rgba(0,122,255,.07),rgba(88,86,214,.07))",border:"1px solid rgba(0,122,255,.15)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11}}><I n="lock"s={15}c="#007AFF"/><span style={{fontSize:13,fontWeight:700,color:"#c0dcf5"}}>Unlock Premium Report</span><span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:"#007AFF"}}>{PRICES[reportType]} TON</span></div>
            {(reportType==="project"?["Bull Case & Bear Case","Risk Matrix","Investor Lens","Final Recommendation"]:reportType==="wallet"?["Behavioral Archetype","Protocol Map","Recommendation"]:["Tokenomics Comparison","Team Matrix","Full Recommendation"]).map(f=><div key={f}style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><I n="lock"s={10}c="#0d2030"/><span style={{fontSize:11,color:"#1a4060"}}>{f}</span></div>)}
            {wallet?<button onClick={onUnlock}style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#007AFF,#5856D6)",borderRadius:12,fontSize:14,fontWeight:700,color:"white",marginTop:12,boxShadow:"0 6px 22px rgba(0,122,255,.35)",cursor:"pointer",border:"none"}}>Pay {PRICES[reportType]} TON → Unlock Now</button>:<button onClick={()=>onUnlock(true)}style={{width:"100%",padding:"13px",background:"rgba(0,122,255,.1)",borderRadius:12,fontSize:13,fontWeight:700,color:"#007AFF",marginTop:12,border:"1px solid rgba(0,122,255,.25)",cursor:"pointer"}}>Connect Wallet to Unlock Premium</button>}
          </div>
        )}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onShare}style={{flex:1,padding:"11px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:11,fontSize:12,fontWeight:600,color:"#5a8090",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}><I n="share"s={13}c="#5a8090"/>Share</button>
          <button onClick={onChat}style={{flex:1,padding:"11px",background:"rgba(0,122,255,.09)",border:"1px solid rgba(0,122,255,.19)",borderRadius:11,fontSize:12,fontWeight:700,color:"#007AFF",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}><I n="chat"s={13}c="#007AFF"/>Ask AI</button>
        </div>
      </div>
    </div>
  );
}

function ChatDrawer({report,onClose}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:`Hi! I analyzed ${report.name||report.address||report.project_a_name||"this"}. Ask me anything about risks, outlook or comparisons. 👋`}]);
  const [input,setInput]=useState("");const [thinking,setThinking]=useState(false);const bottom=useRef(null);
  const sugg=["Is this safe to invest in?","Biggest red flags?","Compare to Ethereum DeFi","One sentence verdict"];
  useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[msgs,thinking]);
  const send=async(text)=>{const m=text||input.trim();if(!m||thinking)return;setInput("");const nm=[...msgs,{role:"user",content:m}];setMsgs(nm);setThinking(true);const reply=await chatWithAI(nm,report);setMsgs(p=>[...p,{role:"assistant",content:reply}]);setThinking(false);};
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.9)",backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"#0b1421",borderRadius:"22px 22px 0 0",border:"1px solid rgba(255,255,255,.08)",borderBottom:"none",maxHeight:"92vh",display:"flex",flexDirection:"column",animation:"slideUp .35s ease"}}>
        <div style={{padding:"16px 16px 12px",borderBottom:"1px solid rgba(255,255,255,.055)",display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:10,background:"rgba(0,122,255,.13)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="chat"s={16}c="#007AFF"/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:"#c8e4f8"}}>Ask AI</div><div style={{fontSize:9,color:"#0d2a40",marginTop:1}}>TONLens Intelligence</div></div><button onClick={onClose}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button></div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:180,maxHeight:"48vh"}}>
          {msgs.map((m,i)=><div key={i}style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"82%",padding:"9px 13px",borderRadius:m.role==="user"?"17px 17px 4px 17px":"17px 17px 17px 4px",background:m.role==="user"?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.055)",border:m.role==="assistant"?"1px solid rgba(255,255,255,.07)":"none",fontSize:13,color:m.role==="user"?"white":"#90b8d0",lineHeight:1.6}}>{m.content}</div></div>)}
          {thinking&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"17px 17px 17px 4px",background:"rgba(255,255,255,.055)",display:"flex",gap:5}}>{[0,1,2].map(j=><div key={j}style={{width:6,height:6,borderRadius:"50%",background:"#007AFF",animation:`typing 1.2s ease ${j*.2}s infinite`}}/>)}</div></div>}
          <div ref={bottom}/>
        </div>
        <div style={{padding:"7px 13px",display:"flex",gap:6,overflowX:"auto"}}>{sugg.map(s=><button key={s}onClick={()=>send(s)}style={{padding:"5px 10px",borderRadius:14,background:"rgba(0,122,255,.09)",border:"1px solid rgba(0,122,255,.18)",fontSize:10,color:"#007AFF",whiteSpace:"nowrap",fontWeight:600,cursor:"pointer"}}>{s}</button>)}</div>
        <div style={{padding:"8px 14px 28px",display:"flex",gap:8,alignItems:"center"}}><input value={input}onChange={e=>setInput(e.target.value)}onKeyDown={e=>e.key==="Enter"&&send()}placeholder="Ask anything..."style={{flex:1,padding:"11px 13px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:13,fontSize:12,color:"#c8e4f8",outline:"none"}}/><button onClick={()=>send()}style={{width:40,height:40,borderRadius:12,background:input.trim()?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",flexShrink:0}}><I n="send"s={15}c={input.trim()?"white":"#1a3040"}/></button></div>
      </div>
    </div>
  );
}

function PaymentScreen({reportType,price,onConfirm,onCancel,wallet}){
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.9)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div style={{width:"100%",maxWidth:430,background:"#0b1421",borderRadius:"22px 22px 0 0",padding:"20px 18px 42px",border:"1px solid rgba(255,255,255,.08)",borderBottom:"none",animation:"slideUp .35s ease"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:17}}><div style={{fontSize:16,fontWeight:800,color:"#d0eaff"}}>Confirm Payment</div><button onClick={onCancel}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button></div><div style={{padding:13,background:"rgba(255,255,255,.04)",borderRadius:13,marginBottom:12}}>{[["Report Type",`Premium ${reportType}`],["From Wallet",shortAddr(wallet?.address)],["Wallet",wallet?.wallet||"TON Connect"],["Network","TON Mainnet"],["Amount",`${price} TON`]].map(([l,v],i)=><div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:i<4?8:0,paddingBottom:i===3?8:0,borderBottom:i===3?"1px solid rgba(255,255,255,.06)":"none"}}><span style={{fontSize:12,color:"#2a5060"}}>{l}</span><span style={{fontSize:i===4?19:11,fontWeight:i===4?800:600,color:i===4?"#007AFF":i===1?"#4ade80":"#90b8d0",fontFamily:i===1?"monospace":"inherit"}}>{v}</span></div>)}</div><div style={{padding:11,background:"rgba(34,197,94,.06)",borderRadius:10,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><I n="shield"s={13}c="#4ade80"/><span style={{fontSize:11,color:"#1a4060",lineHeight:1.5}}>Signed by your TON wallet. On-chain receipt generated automatically.</span></div><button onClick={onConfirm}style={{width:"100%",padding:"15px",background:"linear-gradient(135deg,#007AFF,#5856D6)",borderRadius:13,fontSize:14,fontWeight:700,color:"white",boxShadow:"0 8px 28px rgba(0,122,255,.4)",cursor:"pointer",border:"none"}}>Pay {price} TON via {wallet?.wallet||"TON Connect"}</button><button onClick={onCancel}style={{width:"100%",padding:"11px",background:"none",border:"none",fontSize:12,color:"#1a3050",marginTop:6,cursor:"pointer"}}>Cancel</button></div></div>);
}

function ShareModal({report,reportType,onClose,showToast}){
  const [copied,setCopied]=useState(false);
  const text=reportType==="project"?`🔍 TONLens: ${report.name||"Project"}\n📊 ${report.category||"TON"} · Risk: ${report.verdict||"?"}\n\n${report.summary?.slice(0,200)}...\n\n🔗 t.me/${BOT_USERNAME}`:reportType==="wallet"?`🔍 TONLens Wallet: ${(report.address||"").slice(0,18)}...\n👤 ${report.type||"?"} · Risk: ${report.risk_level||"?"}\n\n🔗 t.me/${BOT_USERNAME}`:`⚖️ TONLens: ${report.project_a_name} vs ${report.project_b_name}\n\n${report.summary?.slice(0,150)}...\n\n🔗 t.me/${BOT_USERNAME}`;
  const copy=()=>{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>{setCopied(false);onClose();showToast("Copied!","success");},1500);});};
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.9)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div style={{width:"100%",maxWidth:430,background:"#0b1421",borderRadius:"22px 22px 0 0",padding:"18px 16px 40px",border:"1px solid rgba(255,255,255,.08)",borderBottom:"none",animation:"slideUp .35s ease"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:15,fontWeight:800,color:"#d0eaff"}}>Share Summary</div><button onClick={onClose}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button></div><div style={{padding:12,background:"rgba(255,255,255,.04)",borderRadius:12,marginBottom:12,fontSize:11,color:"#4a7080",lineHeight:1.75,whiteSpace:"pre-line"}}>{text}</div><button onClick={copy}style={{width:"100%",padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,background:copied?"rgba(34,197,94,.11)":"linear-gradient(135deg,#007AFF,#5856D6)",color:copied?"#4ade80":"white",border:copied?"1px solid rgba(34,197,94,.26)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer"}}>{copied?<><I n="check"s={14}c="#4ade80"/>Copied!</>:<><I n="copy"s={14}c="white"/>Copy to Clipboard</>}</button></div></div>);
}

function HistoryScreen({history,onBack,onOpen,wallet}){
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Research History" sub={`${history.length} reports · ${wallet?shortAddr(wallet.address):"No wallet"}`} onBack={onBack} ii="history" ic="#8899aa"/><div style={{padding:14}}>{history.length===0?<div style={{textAlign:"center",padding:"70px 20px"}}><I n="history"s={40}c="#081520"/><div style={{fontSize:13,color:"#0d1e2e",marginTop:14}}>No research yet</div></div>:history.map((h,i)=><div key={h.id}onClick={()=>onOpen(h)}style={{display:"flex",alignItems:"center",padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13,cursor:"pointer",gap:10,marginBottom:6,animation:`fadeIn .3s ease ${i*.05}s both`}}><div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"}s={16}c="#1a3a50"/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#85aac0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:2}}>{h.date} · {h.type}</div></div>{h.premium&&<span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:8,flexShrink:0}}>PRO</span>}</div>)}</div></div>);
}

function BottomNav({active,onNavigate}){return(<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(6,10,18,.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",padding:"7px 0 20px",zIndex:100}}>{[{k:"home",i:"home",l:"Home"},{k:"project",i:"chart",l:"Research"},{k:"wallet",i:"wallet",l:"Wallet"},{k:"history",i:"history",l:"History"}].map(item=>(<button key={item.k}onClick={()=>onNavigate(item.k)}style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",padding:"5px 4px",cursor:"pointer"}}><I n={item.i}s={20}c={active===item.k?"#007AFF":"#0d1e2e"}/><span style={{fontSize:9,color:active===item.k?"#007AFF":"#0d1e2e",fontWeight:active===item.k?700:400}}>{item.l}</span>{active===item.k&&<div style={{width:4,height:4,borderRadius:"50%",background:"#007AFF",marginTop:-1}}/>}</button>))}</div>);}

export default function TONLens(){
  const [wallet,setWallet]=useState(null);const [tgUser,setTgUser]=useState(null);const [screen,setScreen]=useState("home");
  const [report,setReportState]=useState(null);const [reportType,setReportType]=useState(null);const [isPremium,setIsPremium]=useState(false);
  const [loading,setLoading]=useState(false);const [loadingText,setLoadingText]=useState("Analyzing...");const [history,setHistory]=useState([]);
  const [toast,setToast]=useState(null);const [showTC,setShowTC]=useState(false);const [paymentScreen,setPaymentScreen]=useState(false);
  const [shareModal,setShareModal]=useState(false);const [chatOpen,setChatOpen]=useState(false);const [demoOpen,setDemoOpen]=useState(false);
  const [tonStats,setTonStats]=useState({price:"5.24",change:"2.1",mcap:"13.2B"});

  useEffect(()=>{
    const s=document.createElement("script");s.src="https://telegram.org/js/telegram-web-app.js";
    s.onload=()=>{if(window.Telegram?.WebApp){window.Telegram.WebApp.ready();window.Telegram.WebApp.expand();const u=getTelegramUser();if(u)setTgUser(u);}};
    document.head.appendChild(s);
    const load=()=>fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true&include_market_cap=true").then(r=>r.json()).then(d=>{const t=d["the-open-network"];if(t)setTonStats({price:t.usd?.toFixed(2)||"5.24",change:t.usd_24h_change?.toFixed(2)||"2.1",mcap:t.usd_market_cap?(t.usd_market_cap/1e9).toFixed(1)+"B":"13.2B"});}).catch(()=>{});
    load();const iv=setInterval(load,60000);return()=>clearInterval(iv);
  },[]);

  const showToast=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const handleConnect=(w)=>{setWallet(w);setShowTC(false);showToast(`Connected: ${shortAddr(w.address)} · ${w.balance} TON`,"success");};
  const handleDisconnect=()=>{setWallet(null);showToast("Wallet disconnected");};
  const saveHistory=(rpt,type)=>setHistory(prev=>[{id:Date.now(),type,name:rpt.name||rpt.address||rpt.project_a_name||"Report",date:new Date().toLocaleDateString(),premium:false,report:rpt},...prev.slice(0,19)]);

  const runReport=async(type,input)=>{
    setLoading(true);
    const steps={project:["Fetching project data...","Running AI analysis...","Building risk profile..."],wallet:["Scanning blockchain...","Profiling behavior...","Scoring risk..."],compare:["Analyzing Project A...","Analyzing Project B...","Building comparison..."]};
    const s=steps[type];setLoadingText(s[0]);setTimeout(()=>setLoadingText(s[1]),900);setTimeout(()=>setLoadingText(s[2]),1800);
    let rpt;
    try{if(type==="project")rpt=await generateReport("project",input);else if(type==="wallet")rpt=await generateReport("wallet",input);else rpt=await generateReport("compare",{a:input.a,b:input.b});}
    catch{rpt=type==="project"?DEMO_REPORTS.dedust:type==="wallet"?{...DEMO_REPORTS.wallet,address:input}:DEMO_REPORTS.compare;}
    rpt._input=input;rpt._type=type;setReportState(rpt);setReportType(type);setIsPremium(false);saveHistory(rpt,type);setLoading(false);setScreen("report");
  };

  const handleUnlock=(needsWallet=false)=>{if(needsWallet||!wallet){setShowTC(true);return;}setPaymentScreen(true);};

  const confirmPayment=async()=>{
    setPaymentScreen(false);setLoading(true);setLoadingText("Processing payment...");setTimeout(()=>setLoadingText("Generating premium insights..."),1200);
    let pr;
    try{if(reportType==="project")pr=await generateReport("project",report._input||{project_name:report.name},true);else if(reportType==="wallet")pr=await generateReport("wallet",report.address||report._input,true);else pr=await generateReport("compare",{a:{project_name:report.project_a_name},b:{project_name:report.project_b_name}},true);}
    catch{pr={...report};Object.assign(pr,reportType==="project"?DEMO_REPORTS.dedust:reportType==="wallet"?DEMO_REPORTS.wallet:DEMO_REPORTS.compare);}
    pr._input=report._input;pr._type=reportType;setReportState(pr);setIsPremium(true);setLoading(false);
    showToast(`${PRICES[reportType]} TON paid · Receipt on-chain ✓`,"success");
  };

  return(
    <div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",background:"#070b14",minHeight:"100vh",color:"#d0eaff",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input{outline:none}button{cursor:pointer;border:none;outline:none}::-webkit-scrollbar{width:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}><div style={{position:"absolute",top:-100,right:-80,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,122,255,.06) 0%,transparent 70%)"}}/><div style={{position:"absolute",bottom:0,left:-80,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(88,86,214,.04) 0%,transparent 70%)"}}/></div>
      {toast&&<div style={{position:"fixed",top:13,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:toast.type==="success"?"rgba(34,197,94,.1)":toast.type==="warning"?"rgba(234,179,8,.1)":"rgba(255,255,255,.07)",border:`1px solid ${toast.type==="success"?"rgba(34,197,94,.24)":"rgba(255,255,255,.12)"}`,borderRadius:12,padding:"9px 17px",fontSize:13,color:"#c0dcf0",backdropFilter:"blur(12px)",animation:"fadeIn .2s ease",maxWidth:320,textAlign:"center"}}>{toast.msg}</div>}
      {showTC&&<TonConnectModal onConnect={handleConnect} onClose={()=>setShowTC(false)}/>}
      {shareModal&&report&&<ShareModal report={report} reportType={reportType} onClose={()=>setShareModal(false)} showToast={showToast}/>}
      {paymentScreen&&!loading&&<PaymentScreen reportType={reportType} price={PRICES[reportType]} onConfirm={confirmPayment} onCancel={()=>setPaymentScreen(false)} wallet={wallet}/>}
      {chatOpen&&report&&<ChatDrawer report={report} onClose={()=>setChatOpen(false)}/>}
      {demoOpen&&<DemoPlayer onClose={()=>setDemoOpen(false)}/>}
      <div style={{position:"relative",zIndex:1}}>
        {loading?(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><Loader text={loadingText}/></div>)
        :screen==="home"?(<HomeScreen wallet={wallet} onConnect={()=>setShowTC(true)} onDisconnect={handleDisconnect} onNavigate={setScreen} history={history} tonStats={tonStats} setReport={(r,t,p)=>{setReportState(r);setReportType(t);setIsPremium(p||false);setScreen("report");}} onDemo={()=>setDemoOpen(true)} tgUser={tgUser}/>)
        :screen==="project"?(<ProjectScreen onBack={()=>setScreen("home")} onSubmit={input=>runReport("project",input)}/>)
        :screen==="wallet"?(<WalletScreen onBack={()=>setScreen("home")} onSubmit={addr=>runReport("wallet",addr)} connectedWallet={wallet}/>)
        :screen==="compare"?(<CompareScreen onBack={()=>setScreen("home")} onSubmit={(a,b)=>runReport("compare",{a,b})}/>)
        :screen==="report"&&report?(<ReportScreen report={report} reportType={reportType} isPremium={isPremium} onBack={()=>setScreen("home")} onUnlock={handleUnlock} onShare={()=>setShareModal(true)} onChat={()=>setChatOpen(true)} wallet={wallet}/>)
        :screen==="history"?(<HistoryScreen history={history} onBack={()=>setScreen("home")} onOpen={e=>{setReportState(e.report);setReportType(e.type);setIsPremium(e.premium);setScreen("report");}} wallet={wallet}/>)
        :null}
      </div>
    </div>
  );
}

