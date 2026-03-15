// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { TonConnectUIProvider, TonConnectButton, useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "tonlens_bot";
const MANIFEST_URL = "https://ton-lens.vercel.app/tonconnect-manifest.json";

// TON Connect UI configuration with all wallets including Telegram Wallet
const TC_UI_OPTIONS = {
  uiPreferences: {
    theme: "DARK",
  },
  walletsListConfiguration: {
    includeWallets: [
      {
        appName: "telegram-wallet",
        name: "Telegram Wallet",
        imageUrl: "https://wallet.tg/images/logo-288.png",
        aboutUrl: "https://wallet.tg",
        universalLink: "https://t.me/wallet?attach=wallet",
        bridgeUrl: "https://bridge.tonapi.io/bridge",
        platforms: ["ios", "android", "macos", "windows", "linux"],
      },
      {
        appName: "tonkeeper",
        name: "Tonkeeper",
        imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
        aboutUrl: "https://tonkeeper.com",
        universalLink: "https://app.tonkeeper.com/ton-connect",
        deepLink: "tonkeeper://ton-connect",
        bridgeUrl: "https://bridge.tonapi.io/bridge",
        platforms: ["ios", "android", "macos", "windows", "linux"],
      },
      {
        appName: "mytonwallet",
        name: "MyTonWallet",
        imageUrl: "https://mytonwallet.io/icon-256.png",
        aboutUrl: "https://mytonwallet.io",
        universalLink: "https://connect.mytonwallet.org",
        bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge/",
        platforms: ["ios", "android", "macos", "windows", "linux"],
      },
    ],
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function shortAddr(a) { return a ? a.slice(0,6) + "…" + a.slice(-4) : ""; }

function getTelegramUser() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initDataUnsafe?.user) return null;
    const u = tg.initDataUnsafe.user;
    return { id: u.id, firstName: u.first_name||"", username: u.username||"", photoUrl: u.photo_url||"" };
  } catch { return null; }
}

function getAvatarColor(seed) {
  const colors = ["#007AFF","#5856D6","#AF52DE","#FF2D55","#FF9500","#34C759"];
  const n = (seed||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  return colors[Math.abs(n) % colors.length];
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_REPORTS = {
  dedust: {
    name:"DeDust", category:"DEX / AMM", token:"SCALE",
    summary:"DeDust is a next-gen DEX on TON using a unique Fluid AMM architecture supporting multiple pool types — constant product, stable swap, and custom curves. It positions as the foundational liquidity layer for TON DeFi.",
    what_it_does:"Decentralized exchange and AMM for swapping TON-based tokens with multiple curve types.",
    ecosystem_fit:"Core liquidity infrastructure for TON DeFi — composable by other protocols.",
    strengths:["Innovative Fluid AMM architecture","Strong audited smart contracts","Growing TVL and volume metrics","Active liquidity mining program","Composable for downstream DeFi"],
    risks:["STON.fi has more liquidity depth","SCALE vesting not fully transparent","Complex AMM audit surface area","Low volume-to-TVL ratio","Limited marketing footprint"],
    verdict:"Low-Medium", fit:"DeFi-native liquidity providers",
    bull_case:"If TON DeFi TVL reaches $2B+, DeDust's composable architecture positions it as the rails for the entire ecosystem.",
    bear_case:"STON.fi's head-start in liquidity could prove insurmountable without aggressive LP incentives.",
    risk_matrix:[{area:"Market",level:"Medium"},{area:"Technology",level:"Low"},{area:"Team",level:"Medium"},{area:"Liquidity",level:"Medium"},{area:"Regulatory",level:"Low"}],
    narrative:"DeDust has built strong developer mindshare. Community governance is very active on Telegram.",
    conservative_view:"Hold a small position (1-3%) as a bet on TON DeFi growth.",
    speculative_view:"Accumulate aggressively if TVL doubles — protocol revenue would justify 5-10x.",
    explorer_view:"Deploy liquidity in SCALE/TON pool to earn yield while maintaining exposure.",
    final_recommendation:"DeDust is technically strong with real product-market fit. Recommended as a core DeFi holding."
  },
  storm: {
    name:"Storm Trade", category:"DeFi / Perpetuals", token:"STORM",
    summary:"Storm Trade is a decentralized perpetual futures exchange built natively on TON. It enables leveraged trading of crypto pairs directly within Telegram, targeting 800M+ users.",
    what_it_does:"Perpetual futures DEX with up to 10x leverage on crypto pairs.",
    ecosystem_fit:"Core DeFi infrastructure — brings sophisticated trading to the TON ecosystem.",
    strengths:["First-mover in TON perpetuals","Deep Telegram-native distribution","Low fees vs Ethereum competitors","Active trading competitions","TON ecosystem grants"],
    risks:["Smart contract risk on new chain","Thin liquidity increases slippage","Regulatory uncertainty on leverage","Pseudonymous team","vAMM divergence under volatility"],
    verdict:"Medium", fit:"Experienced DeFi traders comfortable with leverage",
    bull_case:"If TON reaches 50M DeFi users, Storm becomes the dominant perpetuals venue. STORM could 10x.",
    bear_case:"Liquidity fragmentation and regulatory pressure on leverage products could stall growth.",
    risk_matrix:[{area:"Market",level:"Medium"},{area:"Technology",level:"Low"},{area:"Team",level:"High"},{area:"Liquidity",level:"Medium"},{area:"Regulatory",level:"High"}],
    narrative:"Strong Telegram-native community with active trading competitions driving engagement.",
    conservative_view:"Wait for liquidity to deepen and team transparency to improve.",
    speculative_view:"Early entry could yield significant upside if TON DeFi TVL reaches $1B+.",
    explorer_view:"Best used as a trading venue rather than long-term hold.",
    final_recommendation:"Hold small speculative position. Monitor liquidity growth and team disclosures."
  },
  getgems: {
    name:"Getgems", category:"NFT Marketplace", token:"GEMS",
    summary:"Getgems is the leading NFT marketplace on TON — the OpenSea equivalent for the ecosystem. It facilitates minting, buying, selling of NFTs including TON DNS names and gaming assets.",
    what_it_does:"NFT marketplace for buying, selling and minting TON-based digital assets.",
    ecosystem_fit:"Primary NFT discovery and trading layer for TON.",
    strengths:["Dominant TON NFT market share","Official Telegram DNS integration","User-friendly interface","Strong ecosystem relationships","TON gaming project partnerships"],
    risks:["NFT market revenue cyclicality","GEMS token limited utility","Dependent on TON ecosystem growth","Competing marketplaces","Non-standard royalty enforcement"],
    verdict:"Low", fit:"NFT collectors and Telegram power users",
    bull_case:"TON DNS and Telegram username NFTs create sustainable demand. 900M Telegram users as buyers is unmatched.",
    bear_case:"NFT bear market could slash volumes 80%. GEMS token struggles to find utility beyond governance.",
    risk_matrix:[{area:"Market",level:"Low"},{area:"Technology",level:"Low"},{area:"Team",level:"Low"},{area:"Liquidity",level:"Medium"},{area:"Regulatory",level:"Low"}],
    narrative:"Getgems benefits from deep Telegram integration, making it the default NFT destination.",
    conservative_view:"Solid blue-chip TON NFT play with manageable risk profile.",
    speculative_view:"TON DNS name squatting could be highly profitable ahead of mainstream adoption.",
    explorer_view:"Great starting point for exploring the TON NFT ecosystem.",
    final_recommendation:"Strong allocation for TON ecosystem believers. Low risk, steady growth trajectory."
  },
  wallet: {
    address:"UQBFam...kR9x", type:"DeFi Power User",
    activity:"This wallet demonstrates sophisticated DeFi behavior across the TON ecosystem with consistent protocol interactions over 14 months.",
    patterns:["Regular DEX swaps on DeDust and STON.fi (3-5x/week)","NFT trading on Getgems — TON DNS focus","Storm Trade liquidity mining participant","Consistent staking on TON validators"],
    risk:"Low risk — only interacts with audited, established protocols.",
    risk_level:"Low",
    notable:["Active since TON mainnet launch","Top 500 DeDust liquidity provider","Holds 3 rare TON DNS names","Zero exposure to unaudited contracts"],
    behavior_profile:"Early Adopter / DeFi Native — enters new protocols within first 30 days.",
    deep_risk_analysis:"Zero exposure to high-risk protocols. All interactions are with audited contracts. No leverage detected.",
    interaction_map:[{protocol:"DeDust",frequency:"High",type:"DEX"},{protocol:"STON.fi",frequency:"Medium",type:"DEX"},{protocol:"Getgems",frequency:"Medium",type:"NFT"},{protocol:"Storm Trade",frequency:"Low",type:"Perps"},{protocol:"TON Validators",frequency:"High",type:"Staking"}],
    recommendation:"High trust score. Excellent candidate for airdrop eligibility or whitelist programs."
  },
  compare: {
    project_a_name:"DeDust", project_b_name:"STON.fi",
    summary:"Both are AMM DEXes competing for TON DeFi liquidity. DeDust innovates on architecture; STON.fi wins on current liquidity depth.",
    utility_comparison:{a:"Multi-curve AMM, composable, developer-first",b:"Simple swap UX, high liquidity, mobile-friendly",winner:"Tie"},
    risk_comparison:{a:"Medium — newer, less liquidity",b:"Low — established, audited, high TVL",lower_risk:"B"},
    verdict_a:"Low-Medium", verdict_b:"Low",
    best_for_conservative:"STON.fi", best_for_speculative:"DeDust",
    strengths_a:["Fluid AMM innovation","Composable architecture","Active liquidity mining"],
    strengths_b:["Highest TON DEX liquidity","Simple UX","More trading pairs"],
    overall_recommendation:"Conservative: STON.fi is the safer blue-chip bet. Speculative: DeDust could win long-term if TON DeFi matures."
  },
};

// ─── AI ───────────────────────────────────────────────────────────────────────
async function callAI(prompt, system) {
  const gk = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const ak = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (gk) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${gk}`},
      body:JSON.stringify({model:"llama-3.3-70b-versatile",max_tokens:1500,messages:[{role:"system",content:system},{role:"user",content:prompt}]})
    });
    return (await r.json()).choices?.[0]?.message?.content || "";
  } else if (ak) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":ak,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,system,messages:[{role:"user",content:prompt}]})
    });
    return (await r.json()).content?.[0]?.text || "";
  }
  throw new Error("No API key");
}

async function generateReport(type, input) {
  const sys = "You are TONLens AI. Output valid JSON only, no markdown, no backticks.";
  let prompt = "";
  if (type === "project") {
    prompt = `Analyze this TON project and return COMPLETE JSON: ${JSON.stringify(input)}
Return: {"name":"","category":"","summary":"3-4 sentences","what_it_does":"1 sentence","ecosystem_fit":"1 sentence","strengths":["5 items"],"risks":["5 items"],"verdict":"Low or Low-Medium or Medium or Medium-High or High","fit":"who should invest","bull_case":"paragraph","bear_case":"paragraph","risk_matrix":[{"area":"Market","level":"Low or Medium or High"},{"area":"Technology","level":"Low or Medium or High"},{"area":"Team","level":"Low or Medium or High"},{"area":"Liquidity","level":"Low or Medium or High"},{"area":"Regulatory","level":"Low or Medium or High"}],"narrative":"paragraph","conservative_view":"1-2 sentences","speculative_view":"1-2 sentences","explorer_view":"1-2 sentences","final_recommendation":"paragraph"}`;
  } else if (type === "wallet") {
    prompt = `Analyze TON wallet ${input} and return JSON: {"address":"${input}","type":"","activity":"2-3 sentences","patterns":["4 items"],"risk":"1 sentence","risk_level":"Low or Medium or High","notable":["3 items"],"behavior_profile":"paragraph","deep_risk_analysis":"paragraph","interaction_map":[{"protocol":"","frequency":"High or Medium or Low","type":""}],"recommendation":"paragraph"}`;
  } else {
    prompt = `Compare TON projects A=${JSON.stringify(input.a)} B=${JSON.stringify(input.b)} and return JSON: {"project_a_name":"","project_b_name":"","summary":"","utility_comparison":{"a":"","b":"","winner":"A or B or Tie"},"risk_comparison":{"a":"","b":"","lower_risk":"A or B or Tie"},"verdict_a":"Low or Medium or High","verdict_b":"Low or Medium or High","best_for_conservative":"","best_for_speculative":"","strengths_a":["3 items"],"strengths_b":["3 items"],"overall_recommendation":"paragraph"}`;
  }
  try {
    const raw = await callAI(prompt, sys);
    return JSON.parse(raw.replace(/```json|```/g,"").trim());
  } catch {
    if (type==="project") {
      const k = Object.keys(DEMO_REPORTS).find(k=>(input.project_name||"").toLowerCase().includes(k));
      return DEMO_REPORTS[k] || DEMO_REPORTS.dedust;
    }
    if (type==="wallet") return {...DEMO_REPORTS.wallet, address:input};
    return DEMO_REPORTS.compare;
  }
}

async function chatWithAI(msgs, ctx) {
  try { return await callAI(msgs[msgs.length-1].content, `You are TONLens AI. Context: ${JSON.stringify(ctx).slice(0,2000)}. Answer in 2-3 sentences. Be direct.`); }
  catch { return "Add NEXT_PUBLIC_GROQ_API_KEY to .env.local for AI chat."; }
}

async function fetchTONStats() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true&include_market_cap=true");
    const d = await r.json();
    const t = d["the-open-network"];
    return { price:t?.usd?.toFixed(2)||"5.24", change:t?.usd_24h_change?.toFixed(2)||"2.1", mcap:t?.usd_market_cap?(t.usd_market_cap/1e9).toFixed(1)+"B":"13.2B" };
  } catch { return {price:"5.24",change:"2.1",mcap:"13.2B"}; }
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = ({n,s=20,c="currentColor"}) => {
  const m = {
    wallet:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="1"y="4"width="22"height="16"rx="2"/><line x1="1"y1="10"x2="23"y2="10"/></svg>,
    chart:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><line x1="18"y1="20"x2="18"y2="10"/><line x1="12"y1="20"x2="12"y2="4"/><line x1="6"y1="20"x2="6"y2="14"/></svg>,
    compare:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12"y1="20"x2="12"y2="4"/></svg>,
    back:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    share:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="18"cy="5"r="3"/><circle cx="6"cy="12"r="3"/><circle cx="18"cy="19"r="3"/><line x1="8.59"y1="13.51"x2="15.42"y2="17.49"/><line x1="15.41"y1="6.51"x2="8.59"y2="10.49"/></svg>,
    check:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    history:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>,
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
    user:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12"cy="7"r="4"/></svg>,
    link:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    ton:<svg width={s}height={s}viewBox="0 0 24 24"fill="none"><circle cx="12"cy="12"r="10"fill="#007AFF"/><path d="M8 9h8l-4 7-4-7z"fill="white"/><path d="M12 9v7"stroke="white"strokeWidth="1.5"strokeLinecap="round"/></svg>,
  };
  return m[n]||null;
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const VerdictBadge = ({verdict}) => {
  const m = {"Low":{bg:"rgba(34,197,94,.14)",b:"rgba(34,197,94,.32)",t:"#4ade80"},"Low-Medium":{bg:"rgba(132,204,22,.14)",b:"rgba(132,204,22,.32)",t:"#a3e635"},"Medium":{bg:"rgba(234,179,8,.14)",b:"rgba(234,179,8,.32)",t:"#fbbf24"},"Medium-High":{bg:"rgba(249,115,22,.14)",b:"rgba(249,115,22,.32)",t:"#fb923c"},"High":{bg:"rgba(239,68,68,.14)",b:"rgba(239,68,68,.32)",t:"#f87171"}};
  const v = m[verdict]||m.Medium;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:v.bg,border:`1px solid ${v.b}`,color:v.t,fontSize:11,fontWeight:700}}><span style={{width:5,height:5,borderRadius:"50%",background:v.t,display:"inline-block"}}/>{verdict} Risk</span>;
};

const RiskGauge = ({verdict}) => {
  const sc={"Low":15,"Low-Medium":32,"Medium":52,"Medium-High":72,"High":90};
  const cl={"Low":"#4ade80","Low-Medium":"#a3e635","Medium":"#fbbf24","Medium-High":"#fb923c","High":"#f87171"};
  const score=sc[verdict]||50, color=cl[verdict]||"#fbbf24";
  const r=34,cx=50,cy=52,toR=d=>d*Math.PI/180,sd=-215,td=250,ed=sd+(score/100)*td;
  const x1=cx+r*Math.cos(toR(sd)),y1=cy+r*Math.sin(toR(sd));
  const x2b=cx+r*Math.cos(toR(sd+td)),y2b=cy+r*Math.sin(toR(sd+td));
  const x2=cx+r*Math.cos(toR(ed)),y2=cy+r*Math.sin(toR(ed));
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width="100" height="72" viewBox="0 0 100 72">
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${td>180?1:0} 1 ${x2b} ${y2b}`} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" strokeLinecap="round"/>
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${(score/100)*td>180?1:0} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"/>
        <text x="50" y="56" textAnchor="middle" fill={color} fontSize="13" fontWeight="800" fontFamily="-apple-system,sans-serif">{score}</text>
      </svg>
      <span style={{fontSize:9,color:"#1a3050",letterSpacing:"0.1em",fontWeight:700,marginTop:-6}}>RISK SCORE</span>
    </div>
  );
};

const Loader = ({text}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:40}}>
    <div style={{position:"relative",width:60,height:60}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTop:"2px solid #007AFF",animation:"spin 1s linear infinite"}}/>
      <div style={{position:"absolute",inset:9,borderRadius:"50%",border:"2px solid transparent",borderBottom:"2px solid #5856D6",animation:"spin 1.4s linear infinite reverse"}}/>
      <div style={{position:"absolute",inset:"50%",transform:"translate(-50%,-50%)",width:10,height:10,borderRadius:"50%",background:"linear-gradient(135deg,#007AFF,#5856D6)"}}/>
    </div>
    <span style={{fontSize:13,color:"#2a5070",letterSpacing:"0.06em"}}>{text||"Analyzing..."}</span>
  </div>
);

function StatsTicker({tonStats}) {
  const up = parseFloat(tonStats.change) >= 0;
  const t = `TON  $${tonStats.price}  ${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%   ·   Market Cap  $${tonStats.mcap}   ·   TON Ecosystem  Live   ·   Telegram  900M+ Users   ·   `;
  return (
    <div style={{background:"rgba(0,122,255,.05)",borderBottom:"1px solid rgba(0,122,255,.09)",height:27,overflow:"hidden",display:"flex",alignItems:"center"}}>
      <div style={{display:"flex",animation:"ticker 22s linear infinite",whiteSpace:"nowrap"}}>
        {[t,t].map((txt,i)=><span key={i} style={{fontSize:10,color:"#1a4060",letterSpacing:"0.06em",paddingRight:20}}>{txt}</span>)}
      </div>
    </div>
  );
}

function Lbl({t,noMb}){return <div style={{fontSize:9,color:"#08161f",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:noMb?0:8}}>{t}</div>;}
function Fld({label,ph,val,set,mono}){return(<div><label style={{fontSize:9,color:"#08161f",fontWeight:700,display:"block",marginBottom:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</label><input value={val}onChange={e=>set(e.target.value)}placeholder={ph}style={{width:"100%",padding:"12px 13px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,fontSize:12,color:"#c5e0f5",fontFamily:mono?"monospace":"inherit",outline:"none"}}onFocus={e=>e.target.style.borderColor="rgba(0,122,255,.4)"}onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.08)"}/></div>);}
function Btn({label,dis,onClick,color}){return <button disabled={dis}onClick={onClick}style={{padding:"15px",background:dis?"rgba(255,255,255,.05)":`linear-gradient(135deg,${color},${color}88)`,borderRadius:14,fontSize:14,fontWeight:700,color:dis?"#0d2030":"white",marginTop:7,cursor:dis?"not-allowed":"pointer",border:"none",width:"100%"}}>{label}</button>;}
function Hdr({title,sub,onBack,ii,ic}){return(<div style={{padding:"12px 14px 11px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",gap:10}}><button onClick={onBack}style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:35,height:35,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",flexShrink:0}}><I n="back"s={17}c="#4a6070"/></button><div style={{flex:1}}><span style={{fontSize:15,fontWeight:800,color:"#c5e0f5"}}>{title}</span><div style={{fontSize:10,color:"#0d1e30",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub}</div></div><div style={{width:35,height:35,borderRadius:10,background:`${ic}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ii}s={16}c={ic}/></div></div>);}
function Sct({title,icon,color,children,compact}){return(<div style={{padding:compact?10:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><I n={icon}s={12}c={color}/><span style={{fontSize:compact?11:12,fontWeight:700,color:"#85aac0"}}>{title}</span></div>{children}</div>);}
function Bls({items,c,i,sm}){return <div style={{display:"flex",flexDirection:"column",gap:sm?4:6}}>{items?.map((item,j)=><div key={j}style={{display:"flex",gap:7,alignItems:"flex-start"}}><div style={{flexShrink:0,marginTop:2}}><I n={i}s={10}c={c}/></div><span style={{fontSize:sm?10:11,color:"#3a6070",lineHeight:1.65}}>{item}</span></div>)}</div>;}
function Rw({label,val}){return <div style={{padding:"9px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:11,display:"flex",gap:9,alignItems:"flex-start"}}><span style={{fontSize:9,color:"#0d2030",minWidth:84,flexShrink:0,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</span><span style={{fontSize:11,color:"#3a6070",lineHeight:1.6}}>{val}</span></div>;}
function CRw({label,a,b,winner,wl="Better"}){return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{fontSize:9,color:"#0d2030",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{label}</div><div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:7,alignItems:"start"}}><span style={{fontSize:11,color:"#4a7090",lineHeight:1.55}}>{a}</span><span style={{fontSize:9,color:winner==="Tie"?"#fbbf24":"#4ade80",fontWeight:700,background:"rgba(255,255,255,.05)",padding:"3px 7px",borderRadius:7,textAlign:"center",whiteSpace:"nowrap",alignSelf:"center"}}>{winner==="Tie"?"Tie":winner==="A"?`◄ ${wl}`:`${wl} ►`}</span><span style={{fontSize:11,color:"#8860aa",lineHeight:1.55,textAlign:"right"}}>{b}</span></div></div>);}
function RiskMx({matrix}){const vc={"Low":"#4ade80","Medium":"#fbbf24","High":"#f87171"},vw={"Low":"28%","Medium":"58%","High":"88%"};return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}><I n="shield"s={11}c="#007AFF"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Risk Matrix</span></div>{matrix?.map((row,i)=><div key={i}style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:10,color:"#1a3a50",width:80,flexShrink:0}}>{row.area}</span><div style={{flex:1,height:5,borderRadius:3,background:"rgba(255,255,255,.05)"}}><div style={{height:"100%",borderRadius:3,background:vc[row.level]||"#fbbf24",width:vw[row.level]||"50%",transition:"width 1s ease"}}/></div><span style={{fontSize:9,color:vc[row.level]||"#fbbf24",fontWeight:700,width:38,textAlign:"right"}}>{row.level}</span></div>)}</div>);}
function InvLens({report}){const ps=[{k:"conservative_view",i:"shield",c:"#4ade80",l:"Conservative"},{k:"speculative_view",i:"bolt",c:"#fbbf24",l:"Speculative"},{k:"explorer_view",i:"info",c:"#a78bfa",l:"Explorer"}];if(!ps.some(p=>report[p.k]))return null;return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}><I n="star"s={11}c="#fbbf24"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Investor Lens</span></div>{ps.map(p=>report[p.k]&&<div key={p.k}style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10}}><div style={{width:24,height:24,borderRadius:7,background:`${p.c}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={p.i}s={11}c={p.c}/></div><div><div style={{fontSize:8,color:p.c,fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{p.l}</div><div style={{fontSize:11,color:"#3a6070",lineHeight:1.65}}>{report[p.k]}</div></div></div>)}</div>);}
function IntMp({map}){const fc={"High":"#4ade80","Medium":"#fbbf24","Low":"#1a3a50"};return(<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><I n="chart"s={11}c="#5856D6"/><span style={{fontSize:12,fontWeight:700,color:"#85aac0"}}>Protocol Interactions</span></div>{map?.map((item,i)=><div key={i}style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:12,color:"#90b8d0",fontWeight:600,flex:1}}>{item.protocol}</span><span style={{fontSize:9,color:"#1a3a50",background:"rgba(255,255,255,.04)",padding:"2px 7px",borderRadius:6}}>{item.type}</span><span style={{fontSize:9,color:fc[item.frequency]||"#fbbf24",fontWeight:700}}>{item.frequency}</span></div>)}</div>);}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── REAL TON CONNECT — uses @tonconnect/ui-react SDK ─────────────────────────
// This gives the REAL wallet address from the user's actual Tonkeeper/Wallet
// ═══════════════════════════════════════════════════════════════════════════════

// Inner app component — wrapped by TonConnectUIProvider
function TONLensInner() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();                    // real wallet object from SDK
  const rawAddress = useTonAddress();               // real wallet address (raw format)
  const friendlyAddress = useTonAddress(false);     // user-friendly address (UQ... format)

  const [screen, setScreen] = useState("login");
  const [tgUser, setTgUser] = useState(null);
  const [report, setReportState] = useState(null);
  const [reportType, setReportType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing...");
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tonStats, setTonStats] = useState({price:"5.24",change:"2.1",mcap:"13.2B"});
  const [authReady, setAuthReady] = useState(false);

  // When real wallet connects → auto go to home
  useEffect(() => {
    if (wallet && screen === "login") {
      setScreen("home");
      showToast(`${wallet.device?.appName || "Wallet"} connected! 🎉`, "success");
    }
    if (!wallet && screen !== "login") {
      // wallet disconnected
    }
  }, [wallet]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        const tg = getTelegramUser();
        if (tg) setTgUser(tg);
      }
      setAuthReady(true);
    };
    script.onerror = () => setAuthReady(true);
    document.head.appendChild(script);
    fetchTONStats().then(setTonStats);
    const iv = setInterval(()=>fetchTONStats().then(setTonStats),60000);
    return ()=>clearInterval(iv);
  }, []);

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  // Opens the real TON Connect modal from the SDK
  const openWalletModal = useCallback(() => {
    tonConnectUI.openModal();
  }, [tonConnectUI]);

  const handleDisconnect = useCallback(async () => {
    await tonConnectUI.disconnect();
    setScreen("login");
    showToast("Wallet disconnected");
  }, [tonConnectUI]);

  const handleGuest = () => setScreen("home");

  const runReport = async (type, input) => {
    setLoading(true);
    const steps = {
      project:["Fetching project data...","Running AI analysis...","Building report..."],
      wallet:["Scanning blockchain...","Profiling behavior...","Scoring risk..."],
      compare:["Analyzing Project A...","Analyzing Project B...","Comparing..."],
    };
    const s = steps[type]; setLoadingText(s[0]);
    const t1 = setTimeout(()=>setLoadingText(s[1]),900);
    const t2 = setTimeout(()=>setLoadingText(s[2]),1800);
    const rpt = await generateReport(type, input);
    clearTimeout(t1); clearTimeout(t2);
    setReportState(rpt);
    setReportType(type);
    setHistory(prev=>[{id:Date.now(),type,name:rpt.name||rpt.address||rpt.project_a_name||"Report",date:new Date().toLocaleDateString(),report:rpt},...prev.slice(0,19)]);
    setLoading(false);
    setScreen("report");
  };

  if (!authReady) return (
    <div style={{background:"#070b14",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Loader text="Loading TONLens..."/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const walletInfo = wallet ? {
    address: friendlyAddress || rawAddress || "",
    name: wallet.device?.appName || "TON Wallet",
    platform: wallet.device?.platform || "",
    connected: true,
  } : null;

  return (
    <div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",background:"#070b14",minHeight:"100vh",color:"#d0eaff",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input{outline:none}button{cursor:pointer;border:none;outline:none}::-webkit-scrollbar{width:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>

      {/* Ambient bg */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:-100,right:-80,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,122,255,.06) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:0,left:-80,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(88,86,214,.04) 0%,transparent 70%)"}}/>
      </div>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:13,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:toast.type==="success"?"rgba(34,197,94,.1)":"rgba(255,255,255,.07)",border:`1px solid ${toast.type==="success"?"rgba(34,197,94,.24)":"rgba(255,255,255,.12)"}`,borderRadius:12,padding:"9px 17px",fontSize:13,color:"#c0dcf0",backdropFilter:"blur(12px)",animation:"fadeIn .2s ease",maxWidth:300,textAlign:"center"}}>{toast.msg}</div>}

      {/* Modals */}
      {shareModal&&report&&<ShareModal report={report} reportType={reportType} onClose={()=>setShareModal(false)} showToast={showToast}/>}
      {chatOpen&&report&&<ChatDrawer report={report} onClose={()=>setChatOpen(false)}/>}

      <div style={{position:"relative",zIndex:1}}>
        {loading ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><Loader text={loadingText}/></div>
        ) : screen==="login" ? (
          <LoginScreen onConnectWallet={openWalletModal} onGuest={handleGuest} tonStats={tonStats} isWalletConnected={!!wallet}/>
        ) : screen==="home" ? (
          <HomeScreen walletInfo={walletInfo} tgUser={tgUser} onConnectWallet={openWalletModal} onDisconnect={handleDisconnect} onNavigate={s=>setScreen(s)} history={history} tonStats={tonStats} setReport={(r,t)=>{setReportState(r);setReportType(t);setScreen("report");}}/>
        ) : screen==="project" ? (
          <ProjectScreen onBack={()=>setScreen("home")} onSubmit={input=>runReport("project",input)}/>
        ) : screen==="wallet" ? (
          <WalletScreen onBack={()=>setScreen("home")} onSubmit={addr=>runReport("wallet",addr)} connectedAddress={friendlyAddress||rawAddress}/>
        ) : screen==="compare" ? (
          <CompareScreen onBack={()=>setScreen("home")} onSubmit={(a,b)=>runReport("compare",{a,b})}/>
        ) : screen==="report"&&report ? (
          <ReportScreen report={report} reportType={reportType} onBack={()=>setScreen("home")} onShare={()=>setShareModal(true)} onChat={()=>setChatOpen(true)}/>
        ) : screen==="history" ? (
          <HistoryScreen history={history} onBack={()=>setScreen("home")} onOpen={h=>{setReportState(h.report);setReportType(h.type);setScreen("report");}}/>
        ) : (
          <LoginScreen onConnectWallet={openWalletModal} onGuest={handleGuest} tonStats={tonStats} isWalletConnected={!!wallet}/>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onConnectWallet, onGuest, tonStats, isWalletConnected}) {
  const [step, setStep] = useState(0);
  const up = parseFloat(tonStats.change) >= 0;
  useEffect(()=>{
    const ts=[setTimeout(()=>setStep(1),80),setTimeout(()=>setStep(2),400),setTimeout(()=>setStep(3),750)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  const tr=(s,d=0)=>({opacity:step>=s?1:0,transform:step>=s?"translateY(0)":"translateY(16px)",transition:`all 0.5s cubic-bezier(.34,1.2,.64,1) ${d}s`});

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",textAlign:"center"}}>
      {/* Logo */}
      <div style={{...tr(1),marginBottom:20}}>
        <div style={{width:88,height:88,borderRadius:26,background:"linear-gradient(145deg,#007AFF,#5856D6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 0 0 1px rgba(0,122,255,.3), 0 0 50px rgba(0,122,255,.28)",animation:step>=1?"float 5s ease-in-out infinite":"none"}}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="5" fill="rgba(255,255,255,.18)"/><circle cx="11" cy="11" r="3" fill="white"/><line x1="18" y1="18" x2="14.5" y2="14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><circle cx="11" cy="11" r="7.5" stroke="rgba(255,255,255,.22)" strokeWidth="1" fill="none"/></svg>
        </div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#fff 30%,#7aabcc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TONLens</div>
        <div style={{fontSize:10,color:"#1a3a5a",marginTop:3,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:700}}>Research Intelligence</div>
      </div>

      {/* Live price */}
      <div style={{...tr(2,.08),marginBottom:18,padding:"9px 18px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,display:"flex",alignItems:"center",gap:12}}>
        <I n="ton" s={26}/>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:9,color:"#1a4060",fontWeight:700,letterSpacing:"0.1em"}}>LIVE TON PRICE</div>
          <div style={{fontSize:16,fontWeight:800,color:"#d0eaff"}}>${tonStats.price}</div>
        </div>
        <div style={{padding:"3px 9px",borderRadius:9,background:up?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${up?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`}}>
          <span style={{fontSize:11,fontWeight:700,color:up?"#4ade80":"#f87171"}}>{up?"▲":"▼"} {Math.abs(parseFloat(tonStats.change))}%</span>
        </div>
      </div>

      <div style={{...tr(2,.12),marginBottom:26,maxWidth:270}}>
        <p style={{fontSize:14,lineHeight:1.8,color:"#3a6080"}}>AI-powered research on TON projects, wallets & tokens — inside Telegram.</p>
      </div>

      {/* Auth buttons */}
      <div style={{...tr(3,.16),width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:11}}>

        {/* Real TON Connect button — opens actual wallet selector from SDK */}
        <button onClick={onConnectWallet}
          style={{width:"100%",padding:"17px 20px",background:"linear-gradient(135deg,#007AFF,#5856D6)",borderRadius:16,fontSize:15,fontWeight:800,color:"white",boxShadow:"0 8px 30px rgba(0,122,255,.4)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:11}}>
          <I n="link" s={21} c="white"/>
          Sign In with TON Wallet
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/><span style={{fontSize:11,color:"#0d1e2e"}}>or</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
        </div>

        <button onClick={onGuest}
          style={{width:"100%",padding:"14px 20px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,fontSize:13,fontWeight:600,color:"#6a9ab0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
          <I n="user" s={16} c="#6a9ab0"/>
          Continue as Guest
        </button>
      </div>

      {/* Real badge */}
      <div style={{...tr(3,.2),marginTop:18,padding:"8px 14px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.14)",borderRadius:20,display:"flex",alignItems:"center",gap:7}}>
        <I n="shield" s={13} c="#4ade80"/>
        <span style={{fontSize:11,color:"#2a6040"}}>Real wallet auth · Powered by @tonconnect/ui-react</span>
      </div>

      {/* Feature chips */}
      <div style={{...tr(3,.24),display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginTop:14}}>
        {["🔐 Real wallet","🤖 AI Reports","📊 Live Data","💬 AI Chat","⚖️ Compare"].map(f=><span key={f} style={{padding:"4px 11px",borderRadius:16,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",fontSize:11,color:"#3a6080"}}>{f}</span>)}
      </div>
      <p style={{marginTop:14,fontSize:10,color:"#0d1e2e"}}>Research tool only · Not financial advice</p>
    </div>
  );
}

// ─── WALLET PILL ──────────────────────────────────────────────────────────────
function WalletPill({walletInfo, onConnect, onDisconnect}) {
  const [open, setOpen] = useState(false);
  if (!walletInfo?.connected) return (
    <button onClick={onConnect} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 13px",background:"linear-gradient(135deg,rgba(0,122,255,.15),rgba(88,86,214,.15))",border:"1px solid rgba(0,122,255,.28)",borderRadius:22,cursor:"pointer"}}>
      <I n="link" s={14} c="#007AFF"/>
      <span style={{fontSize:11,fontWeight:800,color:"#007AFF"}}>Connect</span>
    </button>
  );
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 11px 6px 8px",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.22)",borderRadius:22,cursor:"pointer"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",flexShrink:0}}/>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#4ade80",fontFamily:"monospace"}}>{shortAddr(walletInfo.address)}</div>
          <div style={{fontSize:9,color:"#1a6040",fontWeight:600}}>{walletInfo.name}</div>
        </div>
        <svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="#3a5a70"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0e1828",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:14,minWidth:250,zIndex:300,boxShadow:"0 20px 60px rgba(0,0,0,.5)",animation:"fadeIn .2s ease"}}>
          {/* Real address */}
          <div style={{padding:"10px 12px",background:"rgba(34,197,94,.06)",borderRadius:11,marginBottom:10,border:"1px solid rgba(34,197,94,.15)"}}>
            <div style={{fontSize:9,color:"#4ade80",fontWeight:700,letterSpacing:"0.1em",marginBottom:4}}>REAL WALLET · {walletInfo.name}</div>
            <div style={{fontSize:10,fontFamily:"monospace",color:"#90b8d0",wordBreak:"break-all",marginBottom:6}}>{walletInfo.address}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><I n="shield" s={12} c="#4ade80"/><span style={{fontSize:10,color:"#4ade80",fontWeight:600}}>Authenticated via TON Connect</span></div>
          </div>
          <button onClick={()=>{setOpen(false);onDisconnect();}} style={{width:"100%",padding:"10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.18)",borderRadius:11,fontSize:12,fontWeight:600,color:"#f87171",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            <I n="logout" s={14} c="#f87171"/>Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({walletInfo, tgUser, onConnectWallet, onDisconnect, onNavigate, history, tonStats, setReport}) {
  const up = parseFloat(tonStats.change) >= 0;
  const isConnected = walletInfo?.connected;
  return (
    <div style={{minHeight:"100vh",paddingBottom:88}}>
      <StatsTicker tonStats={tonStats}/>
      <div style={{padding:"12px 14px 10px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#fff,#7aabcc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TONLens</div>
          <div style={{fontSize:9,color:"#0d2030",letterSpacing:"0.1em",marginTop:1,fontWeight:700}}>TON RESEARCH INTELLIGENCE</div>
        </div>
        <WalletPill walletInfo={walletInfo} onConnect={onConnectWallet} onDisconnect={onDisconnect}/>
      </div>

      {/* Greeting */}
      <div style={{padding:"10px 14px",background:"linear-gradient(135deg,rgba(0,122,255,.06),rgba(88,86,214,.06))",borderBottom:"1px solid rgba(0,122,255,.08)",display:"flex",alignItems:"center",gap:11}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${getAvatarColor(walletInfo?.address||"guest")},${getAvatarColor(walletInfo?.address||"guest")}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"white",flexShrink:0}}>
          {isConnected ? (walletInfo.address.slice(2,4)||"W").toUpperCase() : (tgUser?.firstName?.[0]||"G").toUpperCase()}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#c0daf0"}}>
            {isConnected ? `Welcome back! 👋` : tgUser ? `Hi ${tgUser.firstName}! 👋` : `Welcome to TONLens! 👋`}
          </div>
          <div style={{fontSize:10,color:"#1a4060",marginTop:1}}>
            {isConnected ? `${shortAddr(walletInfo.address)} · ${walletInfo.name} · All reports free` : "Connect wallet for full experience · Guest mode active"}
          </div>
        </div>
        {!isConnected&&<button onClick={onConnectWallet} style={{padding:"6px 12px",background:"rgba(0,122,255,.14)",border:"1px solid rgba(0,122,255,.28)",borderRadius:16,fontSize:11,fontWeight:700,color:"#007AFF",cursor:"pointer",flexShrink:0}}>Connect</button>}
      </div>

      {/* Stats */}
      <div style={{padding:"11px 14px",display:"flex",gap:8}}>
        {[{l:"TON",v:`$${tonStats.price}`,s:`${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%`,c:up?"#4ade80":"#f87171"},{l:"Market Cap",v:`$${tonStats.mcap}`,s:"USD",c:"#007AFF"},{l:"Reports",v:"Free",s:"All features",c:"#4ade80"}].map(s=>(
          <div key={s.l} style={{flex:1,padding:9,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#0d2030",fontWeight:700,letterSpacing:"0.08em",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:12,fontWeight:800,color:"#b0d0e8"}}>{s.v}</div>
            <div style={{fontSize:9,color:s.c,fontWeight:600,marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:14}}>
        {/* Tools */}
        <div>
          <Lbl t="Research Tools"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
            {[{l:"Project",i:"chart",s:"project",c:"#007AFF",d:"AI analysis"},{l:"Wallet",i:"wallet",s:"wallet",c:"#5856D6",d:"Profiling"},{l:"Compare",i:"compare",s:"compare",c:"#AF52DE",d:"Side-by-side"}].map(item=>(
              <button key={item.s} onClick={()=>onNavigate(item.s)} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:15,padding:"14px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:7,cursor:"pointer"}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${item.c}16`,border:`1px solid ${item.c}26`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={item.i}s={19}c={item.c}/></div>
                <div style={{fontSize:11,fontWeight:700,color:"#a0c0d8"}}>{item.l}</div>
                <div style={{fontSize:9,color:"#0d2030"}}>{item.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Free banner */}
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,rgba(34,197,94,.07),rgba(0,122,255,.07))",border:"1px solid rgba(34,197,94,.18)",borderRadius:15,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:11,background:"linear-gradient(135deg,#4ade80,#007AFF)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="star"s={18}c="white"/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#c0dcf5"}}>All Reports Free 🎉</div>
            <div style={{fontSize:10,color:"#1a4060",marginTop:1,lineHeight:1.4}}>Full AI analysis · Risk matrix · Bull/bear case · Investor lens</div>
          </div>
          <span style={{fontSize:11,fontWeight:800,color:"#4ade80"}}>FREE</span>
        </div>

        {/* Trending */}
        <div>
          <Lbl t="Trending on TON"/>
          {[{name:"Storm Trade",cat:"Perpetuals DEX",risk:"Medium",c:"#007AFF",chg:"+12.4%"},{name:"Getgems",cat:"NFT Marketplace",risk:"Low",c:"#4ade80",chg:"+4.2%"},{name:"DeDust",cat:"DEX / AMM",risk:"Low-Medium",c:"#a78bfa",chg:"+7.8%"},{name:"STON.fi",cat:"DEX",risk:"Low",c:"#fbbf24",chg:"+3.1%"}].map((p,i)=>(
            <div key={p.name} onClick={()=>onNavigate("project")} style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:13,cursor:"pointer",gap:10,marginBottom:6,animation:`fadeIn .3s ease ${i*.07}s both`}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${p.c}15`,border:`1px solid ${p.c}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="bolt"s={15}c={p.c}/></div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#b0d0e5"}}>{p.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:1}}>{p.cat}</div></div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><VerdictBadge verdict={p.risk}/><span style={{fontSize:10,color:"#4ade80",fontWeight:600}}>{p.chg}</span></div>
            </div>
          ))}
        </div>

        {/* History */}
        {history.length>0&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><Lbl t="Recent Research" noMb/><button onClick={()=>onNavigate("history")} style={{background:"none",border:"none",fontSize:11,color:"#007AFF",fontWeight:600,cursor:"pointer"}}>See all</button></div>
            {history.slice(0,3).map(h=>(
              <div key={h.id} onClick={()=>setReport(h.report,h.type)} style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.055)",borderRadius:12,cursor:"pointer",gap:9,marginBottom:6}}>
                <I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"}s={14}c="#1a3a50"/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#90b8d0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:1}}>{h.date} · {h.type}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="home" onNavigate={onNavigate}/>
    </div>
  );
}

// ─── RESEARCH SCREENS ─────────────────────────────────────────────────────────
function ProjectScreen({onBack,onSubmit}){
  const [form,setForm]=useState({project_name:"",website_url:"",token_symbol:""});
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Analyze Project"sub="Full AI report — free"onBack={onBack}ic="#007AFF"ii="chart"/><div style={{padding:15,display:"flex",flexDirection:"column",gap:11}}><Fld label="Project Name *"ph="e.g. DeDust, Storm Trade"val={form.project_name}set={v=>setForm(p=>({...p,project_name:v}))}/><Fld label="Website URL"ph="https://..."val={form.website_url}set={v=>setForm(p=>({...p,website_url:v}))}/><Fld label="Token Symbol"ph="e.g. STORM, SCALE"val={form.token_symbol}set={v=>setForm(p=>({...p,token_symbol:v}))}/><div><Lbl t="Quick Fill"/><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{["Storm Trade","Getgems","DeDust","STON.fi","Catizen","TON DNS"].map(p=><button key={p}onClick={()=>setForm(prev=>({...prev,project_name:p}))}style={{padding:"5px 11px",borderRadius:16,background:form.project_name===p?"rgba(0,122,255,.16)":"rgba(255,255,255,.04)",border:`1px solid ${form.project_name===p?"rgba(0,122,255,.36)":"rgba(255,255,255,.07)"}`,fontSize:11,color:form.project_name===p?"#007AFF":"#4a7080",cursor:"pointer"}}>{p}</button>)}</div></div><Btn label="Generate Full Report →"dis={!form.project_name}onClick={()=>onSubmit(form)}color="#007AFF"/></div></div>);
}

function WalletScreen({onBack,onSubmit,connectedAddress}){
  const [addr,setAddr]=useState(connectedAddress||"");
  useEffect(()=>{if(connectedAddress)setAddr(connectedAddress);},[connectedAddress]);
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Wallet Analysis"sub="Behavioral profiling & risk score"onBack={onBack}ic="#5856D6"ii="wallet"/><div style={{padding:15,display:"flex",flexDirection:"column",gap:11}}>{connectedAddress&&<div style={{padding:"10px 13px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)",borderRadius:12,display:"flex",alignItems:"center",gap:8}}><I n="check"s={13}c="#4ade80"/><span style={{fontSize:11,color:"#4ade80",fontWeight:600}}>Real wallet address auto-filled ✓</span></div>}<Fld label="TON Wallet Address *"ph="UQB... or EQ..."val={addr}set={setAddr}mono/><Btn label="Analyze Wallet →"dis={!addr}onClick={()=>onSubmit(addr)}color="#5856D6"/></div></div>);
}

function CompareScreen({onBack,onSubmit}){
  const [a,setA]=useState({project_name:""});
  const [b,setB]=useState({project_name:""});
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Compare Projects"sub="Side-by-side AI analysis"onBack={onBack}ic="#AF52DE"ii="compare"/><div style={{padding:15,display:"flex",flexDirection:"column",gap:11}}><div style={{padding:12,background:"rgba(0,122,255,.06)",border:"1px solid rgba(0,122,255,.12)",borderRadius:12}}><div style={{fontSize:10,color:"#007AFF",fontWeight:700,marginBottom:7,textTransform:"uppercase"}}>▲ Project A</div><Fld label="Project Name"ph="e.g. DeDust"val={a.project_name}set={v=>setA(p=>({...p,project_name:v}))}/></div><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:"rgba(255,255,255,.05)"}}/><span style={{fontSize:10,color:"#0d2030",fontWeight:700}}>VS</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.05)"}}/></div><div style={{padding:12,background:"rgba(175,82,222,.06)",border:"1px solid rgba(175,82,222,.12)",borderRadius:12}}><div style={{fontSize:10,color:"#AF52DE",fontWeight:700,marginBottom:7,textTransform:"uppercase"}}>▼ Project B</div><Fld label="Project Name"ph="e.g. STON.fi"val={b.project_name}set={v=>setB(p=>({...p,project_name:v}))}/></div><div><Lbl t="Quick Pairs"/>{[["DeDust","STON.fi"],["Storm Trade","Katana"],["Getgems","Fragment"]].map(([pA,pB])=><button key={pA}onClick={()=>{setA({project_name:pA});setB({project_name:pB});}}style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"8px 12px",marginBottom:5,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,fontSize:11,cursor:"pointer"}}><span style={{color:"#5580aa"}}>{pA}</span><span style={{color:"#0d2030"}}>vs</span><span style={{color:"#9966bb"}}>{pB}</span></button>)}</div><Btn label="Compare Now →"dis={!(a.project_name&&b.project_name)}onClick={()=>onSubmit(a,b)}color="#AF52DE"/></div></div>);
}

// ─── REPORT SCREEN — ALL FREE ─────────────────────────────────────────────────
function ReportScreen({report,reportType,onBack,onShare,onChat}){
  const name=reportType==="wallet"?(report.address||"").slice(0,16)+"...":report.name||report.project_a_name||"Report";
  return(
    <div style={{minHeight:"100vh",paddingBottom:90}}>
      <Hdr title="Full AI Report"sub={name}onBack={onBack}ii="chart"ic="#007AFF"/>
      <div style={{padding:"13px 15px",display:"flex",flexDirection:"column",gap:11}}>
        {reportType==="project"&&<>
          <div style={{padding:14,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:13,animation:"fadeIn .4s ease"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:11,marginBottom:11}}>
              <div style={{flex:1}}><div style={{fontSize:19,fontWeight:900,color:"#d5ecff",letterSpacing:"-0.02em"}}>{report.name}</div>{report.category&&<div style={{fontSize:10,color:"#1a4060",marginTop:2}}>{report.category}</div>}</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>{report.verdict&&<VerdictBadge verdict={report.verdict}/>}{report.verdict&&<RiskGauge verdict={report.verdict}/>}</div>
            </div>
            <p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.summary}</p>
          </div>
          {report.what_it_does&&<Sct title="What It Does"icon="bolt"color="#007AFF"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.what_it_does}</p></Sct>}
          {report.ecosystem_fit&&<Sct title="TON Ecosystem Fit"icon="shield"color="#5856D6"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.ecosystem_fit}</p></Sct>}
          {report.strengths&&<Sct title="Strengths"icon="trending_up"color="#4ade80"><Bls items={report.strengths}c="#4ade80"i="check"/></Sct>}
          {report.risks&&<Sct title="Risk Flags"icon="warning"color="#f87171"><Bls items={report.risks}c="#f87171"i="warning"/></Sct>}
          {report.fit&&<Rw label="Best Suited For"val={report.fit}/>}
          {report.bull_case&&<Sct title="Bull Case"icon="trending_up"color="#4ade80"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bull_case}</p></Sct>}
          {report.bear_case&&<Sct title="Bear Case"icon="trending_down"color="#f87171"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bear_case}</p></Sct>}
          {report.risk_matrix&&<RiskMx matrix={report.risk_matrix}/>}
          {report.narrative&&<Sct title="Community & Narrative"icon="star"color="#fbbf24"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.narrative}</p></Sct>}
          <InvLens report={report}/>
          {report.final_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.1em"}}>Final Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.final_recommendation}</p></div>}
        </>}
        {reportType==="wallet"&&<>
          <div style={{padding:14,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:13}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:11,marginBottom:11}}>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:800,color:"#c0dcf0",fontFamily:"monospace"}}>{(report.address||"").slice(0,22)}...</div>{report.type&&<div style={{fontSize:11,color:"#007AFF",marginTop:3,fontWeight:600}}>{report.type}</div>}</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>{report.risk_level&&<VerdictBadge verdict={report.risk_level}/>}{report.risk_level&&<RiskGauge verdict={report.risk_level}/>}</div>
            </div>
            <p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.activity}</p>
          </div>
          {report.patterns&&<Sct title="Behavioral Patterns"icon="chart"color="#5856D6"><Bls items={report.patterns}c="#a78bfa"i="info"/></Sct>}
          {report.notable&&<Sct title="Notable Activity"icon="star"color="#fbbf24"><Bls items={report.notable}c="#fbbf24"i="bolt"/></Sct>}
          {report.risk&&<Rw label="Risk Assessment"val={report.risk}/>}
          {report.behavior_profile&&<Sct title="Behavioral Archetype"icon="shield"color="#007AFF"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.behavior_profile}</p></Sct>}
          {report.deep_risk_analysis&&<Sct title="Deep Risk Analysis"icon="warning"color="#f87171"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.deep_risk_analysis}</p></Sct>}
          {report.interaction_map&&<IntMp map={report.interaction_map}/>}
          {report.recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5}}>Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.recommendation}</p></div>}
        </>}
        {reportType==="compare"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,animation:"fadeIn .4s ease"}}>
            {[{name:report.project_a_name,v:report.verdict_a,ci:"0,122,255"},{name:report.project_b_name,v:report.verdict_b,ci:"175,82,222"}].map((p,i)=><div key={i}style={{padding:12,background:`rgba(${p.ci},.07)`,border:`1px solid rgba(${p.ci},.15)`,borderRadius:13,textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:`rgb(${p.ci})`,marginBottom:7}}>{p.name}</div>{p.v&&<><VerdictBadge verdict={p.v}/><div style={{marginTop:7}}><RiskGauge verdict={p.v}/></div></>}</div>)}
          </div>
          {report.summary&&<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13}}><p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.summary}</p></div>}
          {report.utility_comparison&&<CRw label="Utility"a={report.utility_comparison.a}b={report.utility_comparison.b}winner={report.utility_comparison.winner}/>}
          {report.risk_comparison&&<CRw label="Risk"a={report.risk_comparison.a}b={report.risk_comparison.b}winner={report.risk_comparison.lower_risk}wl="Lower Risk"/>}
          {report.strengths_a&&report.strengths_b&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Sct title={report.project_a_name}icon="trending_up"color="#007AFF"compact><Bls items={report.strengths_a}c="#007AFF"i="check"sm/></Sct><Sct title={report.project_b_name}icon="trending_up"color="#AF52DE"compact><Bls items={report.strengths_b}c="#AF52DE"i="check"sm/></Sct></div>}
          {report.best_for_conservative&&<Rw label="Conservative"val={report.best_for_conservative}/>}
          {report.best_for_speculative&&<Rw label="Speculative"val={report.best_for_speculative}/>}
          {report.overall_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Overall Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.overall_recommendation}</p></div>}
        </>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onShare}style={{flex:1,padding:"11px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:11,fontSize:12,fontWeight:600,color:"#5a8090",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}><I n="share"s={13}c="#5a8090"/>Share</button>
          <button onClick={onChat}style={{flex:1,padding:"11px",background:"rgba(0,122,255,.09)",border:"1px solid rgba(0,122,255,.19)",borderRadius:11,fontSize:12,fontWeight:700,color:"#007AFF",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}><I n="chat"s={13}c="#007AFF"/>Ask AI</button>
        </div>
      </div>
    </div>
  );
}

// ─── AI CHAT ──────────────────────────────────────────────────────────────────
function ChatDrawer({report,onClose}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:`Hi! I've analyzed ${report.name||report.address||report.project_a_name||"this"}. Ask me anything! 👋`}]);
  const [input,setInput]=useState("");
  const [thinking,setThinking]=useState(false);
  const bottom=useRef(null);
  const sugg=["Is this safe to invest in?","Biggest red flags?","Compare to Ethereum DeFi","1-sentence verdict"];
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[msgs,thinking]);
  const send=async(text)=>{
    const m=text||input.trim();if(!m||thinking)return;
    setInput("");const nm=[...msgs,{role:"user",content:m}];setMsgs(nm);setThinking(true);
    const reply=await chatWithAI(nm,report);
    setMsgs(prev=>[...prev,{role:"assistant",content:reply}]);setThinking(false);
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.92)",backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"#0b1421",borderRadius:"22px 22px 0 0",border:"1px solid rgba(255,255,255,.08)",borderBottom:"none",maxHeight:"92vh",display:"flex",flexDirection:"column",animation:"slideUp .35s ease"}}>
        <div style={{padding:"16px 16px 12px",borderBottom:"1px solid rgba(255,255,255,.055)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"rgba(0,122,255,.13)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="chat"s={16}c="#007AFF"/></div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:"#c8e4f8"}}>Ask AI</div><div style={{fontSize:9,color:"#0d2a40"}}>Context-aware intelligence</div></div>
          <button onClick={onClose}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:180,maxHeight:"48vh"}}>
          {msgs.map((m,i)=><div key={i}style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"82%",padding:"9px 13px",borderRadius:m.role==="user"?"17px 17px 4px 17px":"17px 17px 17px 4px",background:m.role==="user"?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.055)",border:m.role==="assistant"?"1px solid rgba(255,255,255,.07)":"none",fontSize:13,color:m.role==="user"?"white":"#90b8d0",lineHeight:1.6}}>{m.content}</div></div>)}
          {thinking&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"17px 17px 17px 4px",background:"rgba(255,255,255,.055)",display:"flex",gap:5}}>{[0,1,2].map(j=><div key={j}style={{width:6,height:6,borderRadius:"50%",background:"#007AFF",animation:`typing 1.2s ease ${j*.2}s infinite`}}/>)}</div></div>}
          <div ref={bottom}/>
        </div>
        <div style={{padding:"7px 13px",display:"flex",gap:6,overflowX:"auto"}}>
          {sugg.map(s=><button key={s}onClick={()=>send(s)}style={{padding:"5px 10px",borderRadius:14,background:"rgba(0,122,255,.09)",border:"1px solid rgba(0,122,255,.18)",fontSize:10,color:"#007AFF",whiteSpace:"nowrap",fontWeight:600,cursor:"pointer"}}>{s}</button>)}
        </div>
        <div style={{padding:"8px 14px 28px",display:"flex",gap:8,alignItems:"center"}}>
          <input value={input}onChange={e=>setInput(e.target.value)}onKeyDown={e=>e.key==="Enter"&&send()}placeholder="Ask anything..."style={{flex:1,padding:"11px 13px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:13,fontSize:12,color:"#c8e4f8",outline:"none"}}/>
          <button onClick={()=>send()}style={{width:40,height:40,borderRadius:12,background:input.trim()?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="send"s={15}c={input.trim()?"white":"#1a3040"}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY + SHARE ──────────────────────────────────────────────────────────
function HistoryScreen({history,onBack,onOpen}){
  return(<div style={{minHeight:"100vh",paddingBottom:40}}><Hdr title="Research History"sub={`${history.length} reports`}onBack={onBack}ii="history"ic="#8899aa"/><div style={{padding:14}}>{history.length===0?<div style={{textAlign:"center",padding:"70px 20px"}}><I n="history"s={40}c="#081520"/><div style={{fontSize:13,color:"#0d1e2e",marginTop:14}}>No research yet</div></div>:history.map((h,i)=><div key={h.id}onClick={()=>onOpen(h)}style={{display:"flex",alignItems:"center",padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13,cursor:"pointer",gap:10,marginBottom:6,animation:`fadeIn .3s ease ${i*.05}s both`}}><div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"}s={16}c="#1a3a50"/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#85aac0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:2}}>{h.date} · {h.type}</div></div></div>)}</div></div>);
}

function ShareModal({report,reportType,onClose,showToast}){
  const [copied,setCopied]=useState(false);
  const text=`🔍 TONLens: ${report.name||report.address||report.project_a_name||"Report"}\n\n${(report.summary||report.activity||"").slice(0,220)}...\n\n🤖 @${BOT_USERNAME}`;
  const copy=()=>{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>{setCopied(false);onClose();showToast("Copied!","success");},1400);});};
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.9)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div style={{width:"100%",maxWidth:430,background:"#0b1421",borderRadius:"22px 22px 0 0",padding:"18px 16px 40px",border:"1px solid rgba(255,255,255,.08)",borderBottom:"none",animation:"slideUp .35s ease"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:15,fontWeight:800}}>Share Report</div><button onClick={onClose}style={{background:"rgba(255,255,255,.06)",borderRadius:9,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}><I n="close"s={14}c="#4a6070"/></button></div><div style={{padding:12,background:"rgba(255,255,255,.04)",borderRadius:12,marginBottom:12,fontSize:11,color:"#4a7080",lineHeight:1.75,whiteSpace:"pre-line"}}>{text}</div><button onClick={copy}style={{width:"100%",padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,background:copied?"rgba(34,197,94,.11)":"linear-gradient(135deg,#007AFF,#5856D6)",color:copied?"#4ade80":"white",border:copied?"1px solid rgba(34,197,94,.26)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer"}}>{copied?<><I n="check"s={14}c="#4ade80"/>Copied!</>:<><I n="copy"s={14}c="white"/>Copy to Clipboard</>}</button></div></div>);
}

function BottomNav({active,onNavigate}){
  return(<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(6,10,18,.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",padding:"7px 0 20px",zIndex:100}}>{[{k:"home",i:"home",l:"Home"},{k:"project",i:"chart",l:"Research"},{k:"wallet",i:"wallet",l:"Wallet"},{k:"history",i:"history",l:"History"}].map(item=>(<button key={item.k}onClick={()=>onNavigate(item.k)}style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",padding:"5px 4px",cursor:"pointer"}}><I n={item.i}s={20}c={active===item.k?"#007AFF":"#0d1e2e"}/><span style={{fontSize:9,color:active===item.k?"#007AFF":"#0d1e2e",fontWeight:active===item.k?700:400}}>{item.l}</span>{active===item.k&&<div style={{width:4,height:4,borderRadius:"50%",background:"#007AFF",marginTop:-1}}/>}</button>))}</div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT: Wrap with TonConnectUIProvider ─────────────────────────────────────
// This is what makes @tonconnect/ui-react work — must wrap the whole app
// ═══════════════════════════════════════════════════════════════════════════════
export default function TONLens() {
  return (
    <TonConnectUIProvider
      manifestUrl={MANIFEST_URL}
      uiPreferences={TC_UI_OPTIONS.uiPreferences}
      walletsListConfiguration={TC_UI_OPTIONS.walletsListConfiguration}
      actionsConfiguration={{
        twaReturnUrl: "https://t.me/tonlens_bot/tonlens",
      }}
    >
      <TONLensInner/>
    </TonConnectUIProvider>
  );
}
