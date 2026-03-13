// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PRICES = { project: 0.5, wallet: 0.7, compare: 0.8 };
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "tonlens_bot";

// ─── TELEGRAM AUTH HELPERS ────────────────────────────────────────────────────
function getTelegramWebAppUser() {
  try {
    if (typeof window === "undefined") return null;
    const tg = window.Telegram?.WebApp;
    if (!tg?.initDataUnsafe?.user) return null;
    const u = tg.initDataUnsafe.user;
    return {
      id: u.id,
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      username: u.username || "",
      photoUrl: u.photo_url || "",
      isPremium: u.is_premium || false,
      source: "miniapp",
    };
  } catch { return null; }
}

function getInitials(firstName, lastName) {
  return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "TG";
}

function getAvatarColor(id) {
  const colors = ["#007AFF","#5856D6","#AF52DE","#FF2D55","#FF9500","#34C759","#00C7BE"];
  return colors[Math.abs(id || 0) % colors.length];
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_PROJECTS = {
  storm: { name: "Storm Trade", category: "DeFi / Perpetuals", token: "STORM", summary: "Storm Trade is a decentralized perpetual futures exchange built natively on TON. It enables leveraged trading of crypto pairs directly within Telegram, targeting 800M+ users as a distribution channel using a virtual AMM model with an insurance fund.", strengths: ["First-mover in TON perpetuals market", "Deep Telegram-native distribution", "Low fees vs Ethereum competitors", "Active trading competitions community", "Backed by TON ecosystem grants"], risks: ["Smart contract risk on new chain", "Thin liquidity increases slippage", "Regulatory uncertainty on leverage", "Pseudonymous team track record", "vAMM divergence under high volatility"], verdict: "Medium", fit: "Experienced DeFi traders comfortable with leverage", ecosystem_fit: "Core DeFi infrastructure for TON trading ecosystem", what_it_does: "Perpetual futures DEX with up to 10x leverage on crypto pairs" },
  getgems: { name: "Getgems", category: "NFT Marketplace", token: "GEMS", summary: "Getgems is the leading NFT marketplace on TON — the OpenSea equivalent for the ecosystem. It facilitates minting, buying, selling of NFTs including TON DNS names, collectibles, and gaming assets, deeply integrated with Telegram.", strengths: ["Dominant TON NFT market share", "Official Telegram DNS integration", "User-friendly for non-technical users", "Strong ecosystem relationships", "Partnership with TON gaming projects"], risks: ["NFT market revenue cyclicality", "GEMS token limited utility", "Dependent on TON ecosystem growth", "Competing marketplaces risk", "Non-standard royalty enforcement"], verdict: "Low", fit: "NFT collectors and Telegram power users", ecosystem_fit: "Primary NFT discovery and trading layer for TON", what_it_does: "NFT marketplace for buying, selling and minting TON-based digital assets" },
  dedust: { name: "DeDust", category: "DEX / AMM", token: "SCALE", summary: "DeDust is a next-gen DEX on TON using a unique Fluid AMM architecture supporting multiple pool types — constant product, stable swap, and custom curves. It positions as the foundational liquidity layer for TON DeFi.", strengths: ["Innovative Fluid AMM architecture", "Strong audited smart contracts", "Growing TVL and volume metrics", "Active liquidity mining program", "Composable for downstream DeFi"], risks: ["STON.fi has more liquidity depth", "SCALE vesting not fully transparent", "Complex AMM audit surface area", "Low volume-to-TVL ratio", "Limited marketing footprint"], verdict: "Low-Medium", fit: "DeFi-native liquidity providers", ecosystem_fit: "Core liquidity infrastructure for TON DeFi protocols", what_it_does: "Decentralized exchange and AMM for swapping TON-based tokens" },
};

// ─── LIVE TON PRICE ───────────────────────────────────────────────────────────
async function fetchTONStats() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true&include_market_cap=true");
    const data = await res.json();
    const ton = data["the-open-network"];
    return { price: ton?.usd?.toFixed(2) || "5.24", change: ton?.usd_24h_change?.toFixed(2) || "2.1", mcap: ton?.usd_market_cap ? (ton.usd_market_cap / 1e9).toFixed(1) + "B" : "13.2B" };
  } catch { return { price: "5.24", change: "2.1", mcap: "13.2B" }; }
}

// ─── AI CALLS ─────────────────────────────────────────────────────────────────
async function callAI(prompt, systemPrompt) {
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 1000, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";
  } else if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await res.json();
    return d.content?.[0]?.text || "";
  }
  throw new Error("No API key");
}

async function generateProjectReport(input, isPremium = false) {
  const system = `You are TONLens, elite crypto research AI for TON. Output valid JSON only, no markdown.`;
  const extra = isPremium ? `,"bull_case":"string","bear_case":"string","risk_matrix":[{"area":"Market","level":"Medium","detail":""},{"area":"Technology","level":"Low","detail":""},{"area":"Team","level":"High","detail":""},{"area":"Liquidity","level":"Medium","detail":""},{"area":"Regulatory","level":"Low","detail":""}],"narrative":"string","conservative_view":"string","speculative_view":"string","explorer_view":"string","final_recommendation":"string"` : "";
  const prompt = `Generate ${isPremium?"PREMIUM":"FREE"} report for TON project: ${JSON.stringify(input)}. Return ONLY JSON: {"name":"","category":"","summary":"","what_it_does":"","strengths":[],"risks":[],"verdict":"Low or Medium or High","fit":"","ecosystem_fit":""${extra}}`;
  try { const raw = await callAI(prompt, system); return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { const k = Object.keys(DEMO_PROJECTS).find(k => (input.project_name||"").toLowerCase().includes(k)); return DEMO_PROJECTS[k] || DEMO_PROJECTS.dedust; }
}

async function generateWalletReport(addr, isPremium = false) {
  const system = `You are TONLens wallet analyst for TON blockchain. Output valid JSON only, no markdown.`;
  const extra = isPremium ? `,"behavior_profile":"string","deep_risk_analysis":"string","interaction_map":[{"protocol":"DeDust","frequency":"High","type":"DEX"}],"recommendation":"string"` : "";
  const prompt = `Analyze TON wallet: ${addr}. Return ONLY JSON: {"address":"${addr}","type":"","activity":"","patterns":[],"risk":"","risk_level":"Low or Medium or High","notable":[]${extra}}`;
  try { const raw = await callAI(prompt, system); return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { address: addr, type: "Active Trader", activity: "This wallet shows consistent DeFi activity across multiple TON protocols with an experienced user profile.", patterns: ["Regular DEX usage on DeDust and STON.fi", "NFT activity on Getgems", "Early TON ecosystem participant"], risk: "Low risk based on interaction history with established protocols", risk_level: "Low", notable: ["Interacted with 5+ protocols", "Active since early TON days"] }; }
}

async function generateCompareReport(a, b, isPremium = false) {
  const system = `You are TONLens comparative analyst. Output valid JSON only, no markdown.`;
  const extra = isPremium ? `,"overall_recommendation":"string","team_comparison":{"a":"","b":""},"tokenomics_comparison":{"a":"","b":""}` : "";
  const prompt = `Compare: A=${JSON.stringify(a)} vs B=${JSON.stringify(b)}. Return ONLY JSON: {"project_a_name":"","project_b_name":"","summary":"","utility_comparison":{"a":"","b":"","winner":"A or B or Tie"},"risk_comparison":{"a":"","b":"","lower_risk":"A or B or Tie"},"verdict_a":"","verdict_b":"","best_for_conservative":"","best_for_speculative":"","strengths_a":[],"strengths_b":[]${extra}}`;
  try { const raw = await callAI(prompt, system); return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { project_a_name: a.project_name||"A", project_b_name: b.project_name||"B", summary: "Both projects serve distinct roles in the TON ecosystem.", utility_comparison: { a: "Unique utility", b: "Unique utility", winner: "Tie" }, risk_comparison: { a: "Medium", b: "Medium", lower_risk: "Tie" }, verdict_a: "Medium", verdict_b: "Medium", best_for_conservative: a.project_name||"A", best_for_speculative: b.project_name||"B", strengths_a: ["Strong community","Clear use case"], strengths_b: ["Technical innovation","Growing TVL"] }; }
}

async function chatWithAI(messages, reportContext) {
  const system = `You are TONLens AI assistant. You analyzed: ${JSON.stringify(reportContext).slice(0,1500)}. Answer in 2-3 sentences. Be direct and honest.`;
  try { return await callAI(messages[messages.length-1].content, system); }
  catch { return "Configure your API key in .env.local to enable AI chat responses."; }
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = ({ n, s = 20, c = "currentColor" }) => {
  const icons = {
    search: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    wallet: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    chart: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    compare: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12" y1="20" x2="12" y2="4"/></svg>,
    back: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    lock: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    share: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    check: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    history: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>,
    diamond: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>,
    warning: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    star: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    bolt: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    close: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    info: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    home: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    chat: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    send: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    trending_up: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    trending_down: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
    shield: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    copy: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    user: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    telegram: <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.042 13.9l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.77.686z"/></svg>,
    logout: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    crown: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>,
  };
  return icons[n] || null;
};

// ─── VERDICT BADGE ────────────────────────────────────────────────────────────
const VerdictBadge = ({ verdict }) => {
  const map = { "Low": { bg: "rgba(34,197,94,.14)", border: "rgba(34,197,94,.32)", text: "#4ade80" }, "Low-Medium": { bg: "rgba(132,204,22,.14)", border: "rgba(132,204,22,.32)", text: "#a3e635" }, "Medium": { bg: "rgba(234,179,8,.14)", border: "rgba(234,179,8,.32)", text: "#fbbf24" }, "Medium-High": { bg: "rgba(249,115,22,.14)", border: "rgba(249,115,22,.32)", text: "#fb923c" }, "High": { bg: "rgba(239,68,68,.14)", border: "rgba(239,68,68,.32)", text: "#f87171" } };
  const v = map[verdict] || map["Medium"];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:v.bg, border:`1px solid ${v.border}`, color:v.text, fontSize:11, fontWeight:700 }}><span style={{ width:5, height:5, borderRadius:"50%", background:v.text, display:"inline-block" }}/>{verdict} Risk</span>;
};

// ─── RISK GAUGE ───────────────────────────────────────────────────────────────
const RiskGauge = ({ verdict }) => {
  const scores = { "Low":15, "Low-Medium":32, "Medium":52, "Medium-High":72, "High":90 };
  const colors = { "Low":"#4ade80", "Low-Medium":"#a3e635", "Medium":"#fbbf24", "Medium-High":"#fb923c", "High":"#f87171" };
  const score = scores[verdict] || 50; const color = colors[verdict] || "#fbbf24";
  const r=34, cx=50, cy=52, toR=d=>d*Math.PI/180, sd=-215, td=250;
  const ed=sd+(score/100)*td;
  const x1=cx+r*Math.cos(toR(sd)), y1=cy+r*Math.sin(toR(sd));
  const x2bg=cx+r*Math.cos(toR(sd+td)), y2bg=cy+r*Math.sin(toR(sd+td));
  const x2=cx+r*Math.cos(toR(ed)), y2=cy+r*Math.sin(toR(ed));
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width="100" height="72" viewBox="0 0 100 72">
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${td>180?1:0} 1 ${x2bg} ${y2bg}`} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" strokeLinecap="round"/>
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${(score/100)*td>180?1:0} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" style={{ filter:`drop-shadow(0 0 5px ${color}90)` }}/>
        <text x="50" y="56" textAnchor="middle" fill={color} fontSize="13" fontWeight="800" fontFamily="-apple-system,sans-serif">{score}</text>
      </svg>
      <span style={{ fontSize:9, color:"#1a3050", letterSpacing:"0.1em", fontWeight:700, marginTop:-6 }}>RISK SCORE</span>
    </div>
  );
};

// ─── LOADER ───────────────────────────────────────────────────────────────────
const Loader = ({ text }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:22, padding:40 }}>
    <div style={{ position:"relative", width:60, height:60 }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTop:"2px solid #007AFF", animation:"spin 1s linear infinite" }}/>
      <div style={{ position:"absolute", inset:9, borderRadius:"50%", border:"2px solid transparent", borderBottom:"2px solid #5856D6", animation:"spin 1.4s linear infinite reverse" }}/>
      <div style={{ position:"absolute", inset:"50%", transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:"linear-gradient(135deg,#007AFF,#5856D6)", boxShadow:"0 0 14px #007AFF" }}/>
    </div>
    <span style={{ fontSize:13, color:"#2a5070", letterSpacing:"0.06em" }}>{text||"Analyzing..."}</span>
  </div>
);

// ─── USER AVATAR ──────────────────────────────────────────────────────────────
function Avatar({ user, size = 36, showBadge = false }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(user?.firstName, user?.lastName);
  const bgColor = getAvatarColor(user?.id);
  const sz = size;
  return (
    <div style={{ position:"relative", width:sz, height:sz, flexShrink:0 }}>
      {user?.photoUrl && !imgError ? (
        <img src={user.photoUrl} alt={user.firstName} onError={()=>setImgError(true)}
          style={{ width:sz, height:sz, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,.1)" }}/>
      ) : (
        <div style={{ width:sz, height:sz, borderRadius:"50%", background:`linear-gradient(135deg,${bgColor},${bgColor}88)`, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(255,255,255,.1)", fontSize:sz*0.35, fontWeight:800, color:"white" }}>
          {initials}
        </div>
      )}
      {showBadge && user?.isPremium && (
        <div style={{ position:"absolute", bottom:-2, right:-2, width:14, height:14, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", border:"2px solid #070b14", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <I n="crown" s={7} c="white"/>
        </div>
      )}
    </div>
  );
}

// ─── STATS TICKER ─────────────────────────────────────────────────────────────
function StatsTicker({ tonStats }) {
  const up = parseFloat(tonStats.change) >= 0;
  const t = `TON  $${tonStats.price}  ${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%   ·   Market Cap  $${tonStats.mcap}   ·   Telegram  900M+ Users   ·   TON Ecosystem  Live   ·   `;
  return (
    <div style={{ background:"rgba(0,122,255,.05)", borderBottom:"1px solid rgba(0,122,255,.09)", height:27, overflow:"hidden", display:"flex", alignItems:"center" }}>
      <div style={{ display:"flex", animation:"ticker 22s linear infinite", whiteSpace:"nowrap" }}>
        {[t,t].map((txt,i) => <span key={i} style={{ fontSize:10, color:"#1a4060", letterSpacing:"0.06em", paddingRight:20 }}>{txt.split("TON  $").map((part,j) => j===0 ? part : <span key={j}><span style={{ color:up?"#4ade80":"#f87171", fontWeight:700 }}>TON  ${part.split("  ")[0]}</span>{"  "+part.split("  ").slice(1).join("  ")}</span>)}</span>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, tonStats }) {
  const [step, setStep] = useState(0);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [loadingWidget, setLoadingWidget] = useState(false);
  const widgetRef = useRef(null);
  const up = parseFloat(tonStats.change) >= 0;

  useEffect(() => {
    const t1 = setTimeout(()=>setStep(1), 100);
    const t2 = setTimeout(()=>setStep(2), 500);
    const t3 = setTimeout(()=>setStep(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Load Telegram Login Widget script
  useEffect(() => {
    if (!widgetLoaded) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    if (widgetRef.current) { widgetRef.current.innerHTML = ""; widgetRef.current.appendChild(script); }
    // Global callback
    window.onTelegramAuth = (user) => {
      onLogin({ id: user.id, firstName: user.first_name||"", lastName: user.last_name||"", username: user.username||"", photoUrl: user.photo_url||"", isPremium: false, source: "widget" });
    };
  }, [widgetLoaded]);

  const tr = (s, d=0) => ({ opacity: step>=s?1:0, transform: step>=s?"translateY(0)":"translateY(18px)", transition: `all 0.55s cubic-bezier(.34,1.3,.64,1) ${d}s` });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
      {/* Logo */}
      <div style={{ ...tr(1), marginBottom:22 }}>
        <div style={{ width:90, height:90, borderRadius:26, background:"linear-gradient(145deg,#007AFF,#5856D6)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 13px", boxShadow:"0 0 0 1px rgba(0,122,255,.3), 0 0 40px rgba(0,122,255,.28)", animation: step>=1?"float 5s ease-in-out infinite, glow 3s ease-in-out infinite":"none" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="5" fill="rgba(255,255,255,.18)"/><circle cx="11" cy="11" r="3" fill="white"/><line x1="18" y1="18" x2="14.5" y2="14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><circle cx="11" cy="11" r="7.5" stroke="rgba(255,255,255,.22)" strokeWidth="1" fill="none"/></svg>
        </div>
        <div style={{ fontSize:32, fontWeight:900, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#fff 30%,#7aabcc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>TONLens</div>
        <div style={{ fontSize:10, color:"#1a3a5a", marginTop:3, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700 }}>Research Intelligence</div>
      </div>

      {/* Live TON price */}
      <div style={{ ...tr(2,.1), marginBottom:20, padding:"10px 20px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:15, display:"flex", alignItems:"center", gap:13 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#007AFF,#5856D6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:14, fontWeight:900, color:"white" }}>◈</span>
        </div>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontSize:9, color:"#1a4060", fontWeight:700, letterSpacing:"0.1em" }}>LIVE TON PRICE</div>
          <div style={{ fontSize:15, fontWeight:800, color:"#d0eaff" }}>${tonStats.price}</div>
        </div>
        <div style={{ padding:"3px 9px", borderRadius:9, background:up?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)", border:`1px solid ${up?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:up?"#4ade80":"#f87171" }}>{up?"▲":"▼"} {Math.abs(parseFloat(tonStats.change))}%</span>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ ...tr(2,.15), marginBottom:28, maxWidth:265 }}>
        <p style={{ fontSize:15, lineHeight:1.7, color:"#3a6080", fontWeight:400 }}>Instant AI research on TON projects, wallets & tokens — inside Telegram.</p>
      </div>

      {/* Auth Options */}
      <div style={{ ...tr(3,.2), width:"100%", maxWidth:340, display:"flex", flexDirection:"column", gap:11 }}>
        {/* Method 1: Demo / Guest */}
        <button onClick={() => onLogin({ id: 999999, firstName: "Demo", lastName: "User", username: "demo_user", photoUrl: "", isPremium: false, source: "guest" })}
          style={{ width:"100%", padding:"15px 20px", background:"linear-gradient(135deg,#007AFF,#5856D6)", borderRadius:16, fontSize:15, fontWeight:800, color:"white", boxShadow:"0 8px 30px rgba(0,122,255,.4), 0 0 0 1px rgba(0,122,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <I n="telegram" s={20} c="white"/>
          Continue with Telegram
        </button>

        {/* Method 2: Telegram Login Widget */}
        <div style={{ position:"relative" }}>
          {!widgetLoaded ? (
            <button onClick={() => { setLoadingWidget(true); setWidgetLoaded(true); }}
              style={{ width:"100%", padding:"14px 20px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:14, fontSize:13, fontWeight:600, color:"#6a9ab0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
              {loadingWidget ? <span style={{ fontSize:12, color:"#3a6080" }}>Loading widget...</span> : <><I n="user" s={16} c="#6a9ab0"/>Login with Telegram Widget</>}
            </button>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:11, color:"#2a4a60", marginBottom:4 }}>Login with your Telegram account:</div>
              <div ref={widgetRef} style={{ display:"flex", justifyContent:"center" }}/>
            </div>
          )}
        </div>

        {/* Guest mode */}
        <button onClick={() => onLogin({ id: 0, firstName: "Guest", lastName: "", username: "", photoUrl: "", isPremium: false, source: "guest" })}
          style={{ background:"none", border:"none", fontSize:12, color:"#1a3a50", cursor:"pointer", padding:"6px", textDecoration:"underline" }}>
          Continue as Guest (no login)
        </button>
      </div>

      {/* Features */}
      <div style={{ ...tr(3,.3), display:"flex", flexWrap:"wrap", gap:7, justifyContent:"center", marginTop:24 }}>
        {["🔐 Secure Auth","🤖 AI Reports","💎 TON Pay","💬 AI Chat","📊 Live Data"].map(f => <span key={f} style={{ padding:"4px 11px", borderRadius:16, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", fontSize:11, color:"#3a6080" }}>{f}</span>)}
      </div>
      <p style={{ marginTop:14, fontSize:10, color:"#0d1e2e" }}>Research tool only · Not financial advice</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── USER PROFILE CARD ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function UserProfileCard({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const displayName = user.firstName + (user.lastName ? " "+user.lastName : "");
  const sourceLabel = user.source==="miniapp" ? "Telegram Mini App" : user.source==="widget" ? "Telegram Login" : "Guest";
  const sourceBadgeColor = user.source==="guest" ? "#4a6080" : "#007AFF";
  return (
    <div style={{ position:"relative" }}>
      <button onClick={()=>setOpen(!open)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px 5px 5px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", borderRadius:22, cursor:"pointer" }}>
        <Avatar user={user} size={28} showBadge />
        <div style={{ textAlign:"left" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#c0d8f0", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.source==="guest"?"Guest":displayName}</div>
          {user.username && <div style={{ fontSize:9, color:"#2a4a60" }}>@{user.username}</div>}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a5a70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#0e1828", border:"1px solid rgba(255,255,255,.1)", borderRadius:16, padding:14, minWidth:220, zIndex:200, boxShadow:"0 20px 60px rgba(0,0,0,.5)", animation:"fadeIn .2s ease" }}>
          {/* Profile */}
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:13, paddingBottom:13, borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <Avatar user={user} size={44} showBadge />
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#d0eaff" }}>{user.source==="guest"?"Guest Mode":displayName}</div>
              {user.username && <div style={{ fontSize:11, color:"#3a6080", marginTop:1 }}>@{user.username}</div>}
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:5 }}>
                <I n="telegram" s={11} c={sourceBadgeColor}/>
                <span style={{ fontSize:10, color:sourceBadgeColor, fontWeight:600 }}>{sourceLabel}</span>
              </div>
            </div>
          </div>
          {/* Stats */}
          {user.source !== "guest" && (
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {[["ID", user.id?.toString().slice(0,6)+"…"], ["Premium", user.isPremium?"Yes":"No"]].map(([l,v]) => (
                <div key={l} style={{ flex:1, padding:"8px 10px", background:"rgba(255,255,255,.04)", borderRadius:10, textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"#1a3a50", fontWeight:700, letterSpacing:"0.08em" }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:l==="Premium"&&v==="Yes"?"#fbbf24":"#7a9ab0", marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{ setOpen(false); onLogout(); }} style={{ width:"100%", padding:"10px", background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.18)", borderRadius:11, fontSize:12, fontWeight:600, color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <I n="logout" s={14} c="#f87171"/>
            {user.source==="guest"?"Login with Telegram":"Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ user, walletConnected, walletAddress, onConnect, onDisconnect, onNavigate, history, tonStats, setReport }) {
  const up = parseFloat(tonStats.change) >= 0;
  const isLoggedIn = user && user.source !== "guest";
  const greeting = user ? `Welcome${isLoggedIn ? `, ${user.firstName}` : ""}! 👋` : "Welcome! 👋";
  return (
    <div style={{ minHeight:"100vh", paddingBottom:88 }}>
      <StatsTicker tonStats={tonStats}/>
      {/* Header */}
      <div style={{ padding:"13px 15px 11px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.02em", background:"linear-gradient(135deg,#fff,#7aabcc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>TONLens</div>
          <div style={{ fontSize:10, color:"#0d2030", letterSpacing:"0.1em", marginTop:1, fontWeight:700 }}>TON RESEARCH INTELLIGENCE</div>
        </div>
        <WalletPill connected={walletConnected} address={walletAddress} onConnect={onConnect} onDisconnect={onDisconnect}/>
      </div>

      {/* Personalized greeting */}
      {user && (
        <div style={{ padding:"11px 15px", background:"linear-gradient(135deg,rgba(0,122,255,.07),rgba(88,86,214,.07))", borderBottom:"1px solid rgba(0,122,255,.1)", display:"flex", alignItems:"center", gap:12 }}>
          <Avatar user={user} size={38} showBadge/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#c0daf0" }}>{greeting}</div>
            <div style={{ fontSize:10, color:"#1a4060", marginTop:2 }}>
              {isLoggedIn ? `Signed in via Telegram ${user.source==="miniapp"?"Mini App":"Widget"} · Research history saved` : "Guest mode · Login to save your research history"}
            </div>
          </div>
          {!isLoggedIn && (
            <button onClick={() => onNavigate("login")} style={{ padding:"6px 12px", background:"rgba(0,122,255,.15)", border:"1px solid rgba(0,122,255,.28)", borderRadius:18, fontSize:11, fontWeight:700, color:"#007AFF", cursor:"pointer" }}>
              Login
            </button>
          )}
          {isLoggedIn && user.isPremium && (
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.22)", borderRadius:16 }}>
              <I n="crown" s={12} c="#fbbf24"/>
              <span style={{ fontSize:10, color:"#fbbf24", fontWeight:700 }}>Telegram Premium</span>
            </div>
          )}
        </div>
      )}

      {/* Live stats */}
      <div style={{ padding:"11px 15px", display:"flex", gap:8 }}>
        {[{label:"TON Price",val:`$${tonStats.price}`,sub:`${up?"▲":"▼"} ${Math.abs(parseFloat(tonStats.change))}%`,c:up?"#4ade80":"#f87171"},{label:"Market Cap",val:`$${tonStats.mcap}`,sub:"USD",c:"#007AFF"},{label:"Network",val:"Live",sub:"TON Chain",c:"#a78bfa"}].map(s => (
          <div key={s.label} style={{ flex:1, padding:9, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#0d2030", fontWeight:700, letterSpacing:"0.08em", marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:13, fontWeight:800, color:"#b0d0e8" }}>{s.val}</div>
            <div style={{ fontSize:9, color:s.c, fontWeight:600, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:"0 15px", display:"flex", flexDirection:"column", gap:15 }}>
        {/* Research Tools */}
        <div>
          <Lbl t="Research Tools"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9 }}>
            {[{l:"Project",i:"chart",s:"project",c:"#007AFF",d:"AI analysis"},{l:"Wallet",i:"wallet",s:"wallet",c:"#5856D6",d:"Profiling"},{l:"Compare",i:"compare",s:"compare",c:"#AF52DE",d:"Side-by-side"}].map(item => (
              <button key={item.s} onClick={()=>onNavigate(item.s)} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:15, padding:"14px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:7, cursor:"pointer" }}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${item.c}16`, border:`1px solid ${item.c}26`, display:"flex", alignItems:"center", justifyContent:"center" }}><I n={item.i} s={19} c={item.c}/></div>
                <div style={{ fontSize:11, fontWeight:700, color:"#a0c0d8" }}>{item.l}</div>
                <div style={{ fontSize:9, color:"#0d2030" }}>{item.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Premium Banner */}
        <div style={{ padding:"12px 14px", background:"linear-gradient(135deg,rgba(0,122,255,.09),rgba(88,86,214,.09))", border:"1px solid rgba(0,122,255,.15)", borderRadius:15, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,#007AFF,#5856D6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><I n="diamond" s={18} c="white"/></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#c0dcf5" }}>Premium Deep Reports</div>
            <div style={{ fontSize:10, color:"#1a4060", marginTop:2, lineHeight:1.4 }}>Bull/bear · Risk matrix · AI chat · Investor lens</div>
          </div>
          <div style={{ fontSize:14, fontWeight:800, color:"#007AFF" }}>0.5 TON</div>
        </div>

        {/* Trending */}
        <div>
          <Lbl t="Trending on TON"/>
          {[{name:"Storm Trade",cat:"Perpetuals DEX",risk:"Medium",c:"#007AFF",chg:"+12.4%"},{name:"Getgems",cat:"NFT Marketplace",risk:"Low",c:"#4ade80",chg:"+4.2%"},{name:"DeDust",cat:"DEX / AMM",risk:"Low-Medium",c:"#a78bfa",chg:"+7.8%"},{name:"STON.fi",cat:"DEX",risk:"Low",c:"#fbbf24",chg:"+3.1%"}].map((p,i) => (
            <div key={p.name} onClick={()=>onNavigate("project")} style={{ display:"flex", alignItems:"center", padding:"10px 12px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:13, cursor:"pointer", gap:10, marginBottom:6, animation:`fadeIn .3s ease ${i*.07}s both` }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${p.c}15`, border:`1px solid ${p.c}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><I n="bolt" s={15} c={p.c}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#b0d0e5" }}>{p.name}</div>
                <div style={{ fontSize:9, color:"#0d2030", marginTop:1 }}>{p.cat}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                <VerdictBadge verdict={p.risk}/>
                <span style={{ fontSize:10, color:"#4ade80", fontWeight:600 }}>{p.chg}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Research */}
        {history.length > 0 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <Lbl t={isLoggedIn ? `${user.firstName}'s Research` : "Recent Research"} noMb/>
              <button onClick={()=>onNavigate("history")} style={{ background:"none", border:"none", fontSize:11, color:"#007AFF", fontWeight:600, cursor:"pointer" }}>See all</button>
            </div>
            {history.slice(0,3).map(h => (
              <div key={h.id} onClick={()=>setReport(h.report,h.type,h.premium)} style={{ display:"flex", alignItems:"center", padding:"10px 12px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12, cursor:"pointer", gap:9, marginBottom:6 }}>
                <I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"} s={14} c="#1a3a50"/>
                <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:600, color:"#90b8d0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name}</div><div style={{ fontSize:9, color:"#0d2030", marginTop:1 }}>{h.date} · {h.type}</div></div>
                {h.premium && <span style={{ fontSize:9, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 7px", borderRadius:8 }}>PRO</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="home" onNavigate={onNavigate} user={user}/>
    </div>
  );
}

function WalletPill({ connected, address, onConnect, onDisconnect }) {
  return connected ? (
    <button onClick={onDisconnect} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px", background:"rgba(34,197,94,.07)", border:"1px solid rgba(34,197,94,.18)", borderRadius:20, cursor:"pointer" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80" }}/>
      <span style={{ fontSize:10, color:"#4ade80", fontWeight:700, fontFamily:"monospace" }}>{address.slice(0,6)}…{address.slice(-4)}</span>
    </button>
  ) : (
    <button onClick={onConnect} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px", background:"rgba(0,122,255,.09)", border:"1px solid rgba(0,122,255,.22)", borderRadius:20, cursor:"pointer" }}>
      <I n="wallet" s={12} c="#007AFF"/><span style={{ fontSize:10, color:"#007AFF", fontWeight:700 }}>Connect</span>
    </button>
  );
}

// ─── RESEARCH SCREENS ─────────────────────────────────────────────────────────
function ProjectScreen({ onBack, onSubmit }) {
  const [form, setForm] = useState({ project_name:"", website_url:"", telegram_link:"", token_symbol:"" });
  return (
    <div style={{ minHeight:"100vh", paddingBottom:40 }}>
      <Hdr title="Analyze Project" sub="AI-powered due diligence" onBack={onBack} ic="#007AFF" ii="chart"/>
      <div style={{ padding:"15px", display:"flex", flexDirection:"column", gap:11 }}>
        <Fld label="Project Name *" ph="e.g. DeDust, Storm Trade" val={form.project_name} set={v=>setForm(p=>({...p,project_name:v}))}/>
        <Fld label="Website URL" ph="https://..." val={form.website_url} set={v=>setForm(p=>({...p,website_url:v}))}/>
        <Fld label="Telegram / X Link" ph="@channel or https://t.me/..." val={form.telegram_link} set={v=>setForm(p=>({...p,telegram_link:v}))}/>
        <Fld label="Token Symbol" ph="e.g. STORM, SCALE" val={form.token_symbol} set={v=>setForm(p=>({...p,token_symbol:v}))}/>
        <div>
          <Lbl t="Quick Fill"/>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {["Storm Trade","Getgems","DeDust","STON.fi","TON DNS","Catizen"].map(p => <button key={p} onClick={()=>setForm(prev=>({...prev,project_name:p}))} style={{ padding:"5px 11px", borderRadius:16, background:form.project_name===p?"rgba(0,122,255,.16)":"rgba(255,255,255,.04)", border:`1px solid ${form.project_name===p?"rgba(0,122,255,.36)":"rgba(255,255,255,.07)"}`, fontSize:11, color:form.project_name===p?"#007AFF":"#4a7080", cursor:"pointer" }}>{p}</button>)}
          </div>
        </div>
        <Btn label="Generate Report →" dis={!form.project_name} onClick={()=>onSubmit(form)} color="#007AFF"/>
      </div>
    </div>
  );
}

function WalletScreen({ onBack, onSubmit }) {
  const [addr, setAddr] = useState("");
  return (
    <div style={{ minHeight:"100vh", paddingBottom:40 }}>
      <Hdr title="Wallet Analysis" sub="Behavioral profiling & risk scoring" onBack={onBack} ic="#5856D6" ii="wallet"/>
      <div style={{ padding:"15px", display:"flex", flexDirection:"column", gap:11 }}>
        <Fld label="TON Wallet Address *" ph="UQB... or EQ..." val={addr} set={setAddr} mono/>
        <div style={{ padding:12, background:"rgba(88,86,214,.06)", border:"1px solid rgba(88,86,214,.13)", borderRadius:12 }}>
          {["Wallet type classification","Transaction pattern analysis","Protocol interaction history","AI risk score & reasoning","Premium: deep behavioral profile"].map(i => <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}><I n="check" s={10} c="#4ade80"/><span style={{ fontSize:11, color:"#4a7090" }}>{i}</span></div>)}
        </div>
        <div>
          <Lbl t="Demo Wallets"/>
          {["UQBFammmmm...kR9x","EQDxyz789...test4","UQCabc123...demo2"].map(w => <button key={w} onClick={()=>setAddr(w)} style={{ display:"block", width:"100%", padding:"9px 12px", marginBottom:5, background:addr===w?"rgba(88,86,214,.12)":"rgba(255,255,255,.03)", border:`1px solid ${addr===w?"rgba(88,86,214,.32)":"rgba(255,255,255,.06)"}`, borderRadius:10, textAlign:"left", fontSize:11, fontFamily:"monospace", color:addr===w?"#a78bfa":"#1a3050", cursor:"pointer" }}>{w}</button>)}
        </div>
        <Btn label="Analyze Wallet →" dis={!addr} onClick={()=>onSubmit(addr)} color="#5856D6"/>
      </div>
    </div>
  );
}

function CompareScreen({ onBack, onSubmit }) {
  const [a, setA] = useState({ project_name:"" });
  const [b, setB] = useState({ project_name:"" });
  const ready = !!(a.project_name && b.project_name);
  return (
    <div style={{ minHeight:"100vh", paddingBottom:40 }}>
      <Hdr title="Compare Projects" sub="Side-by-side AI analysis" onBack={onBack} ic="#AF52DE" ii="compare"/>
      <div style={{ padding:"15px", display:"flex", flexDirection:"column", gap:11 }}>
        <div style={{ padding:12, background:"rgba(0,122,255,.06)", border:"1px solid rgba(0,122,255,.12)", borderRadius:12 }}>
          <div style={{ fontSize:10, color:"#007AFF", fontWeight:700, marginBottom:7, textTransform:"uppercase" }}>▲ Project A</div>
          <Fld label="Project Name" ph="e.g. DeDust" val={a.project_name} set={v=>setA(p=>({...p,project_name:v}))}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ flex:1, height:1, background:"rgba(255,255,255,.05)" }}/><span style={{ fontSize:10, color:"#0d2030", fontWeight:700 }}>VS</span><div style={{ flex:1, height:1, background:"rgba(255,255,255,.05)" }}/></div>
        <div style={{ padding:12, background:"rgba(175,82,222,.06)", border:"1px solid rgba(175,82,222,.12)", borderRadius:12 }}>
          <div style={{ fontSize:10, color:"#AF52DE", fontWeight:700, marginBottom:7, textTransform:"uppercase" }}>▼ Project B</div>
          <Fld label="Project Name" ph="e.g. STON.fi" val={b.project_name} set={v=>setB(p=>({...p,project_name:v}))}/>
        </div>
        <div>
          <Lbl t="Quick Pairs"/>
          {[["DeDust","STON.fi"],["Storm Trade","Katana DEX"],["Getgems","Fragment"]].map(([pA,pB]) => <button key={pA} onClick={()=>{ setA({project_name:pA}); setB({project_name:pB}); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 12px", marginBottom:5, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, fontSize:11, cursor:"pointer" }}><span style={{color:"#5580aa"}}>{pA}</span><span style={{color:"#0d2030"}}>vs</span><span style={{color:"#9966bb"}}>{pB}</span></button>)}
        </div>
        <Btn label="Compare Now →" dis={!ready} onClick={()=>onSubmit(a,b)} color="#AF52DE"/>
      </div>
    </div>
  );
}

// ─── REPORT SCREEN ────────────────────────────────────────────────────────────
function ReportScreen({ report, reportType, isPremium, onBack, onUnlock, onShare, onChat }) {
  const name = reportType==="wallet"?(report.address||"").slice(0,16)+"...":report.name||report.project_a_name||"Report";
  return (
    <div style={{ minHeight:"100vh", paddingBottom:90 }}>
      <Hdr title={isPremium?"Premium Report":"Free Summary"} sub={name} onBack={onBack} ii={isPremium?"diamond":"chart"} ic={isPremium?"#fbbf24":"#007AFF"} badge={isPremium?"PRO":null}/>
      <div style={{ padding:"13px 15px", display:"flex", flexDirection:"column", gap:11 }}>
        {reportType==="project" && <ProjContent report={report} isPremium={isPremium}/>}
        {reportType==="wallet" && <WalContent report={report} isPremium={isPremium}/>}
        {reportType==="compare" && <CmpContent report={report} isPremium={isPremium}/>}
        {!isPremium && (
          <div style={{ borderRadius:15, padding:16, background:"linear-gradient(135deg,rgba(0,122,255,.07),rgba(88,86,214,.07))", border:"1px solid rgba(0,122,255,.15)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
              <I n="lock" s={15} c="#007AFF"/>
              <span style={{ fontSize:13, fontWeight:700, color:"#c0dcf5" }}>Unlock Premium Report</span>
              <span style={{ marginLeft:"auto", fontSize:14, fontWeight:800, color:"#007AFF" }}>{PRICES[reportType]} TON</span>
            </div>
            {(reportType==="project"?["Bull Case & Bear Case","Risk Matrix visual","Community Narrative","Investor Lens (3 profiles)","Final Recommendation"]:reportType==="wallet"?["Deep Behavioral Profile","Protocol Interaction Map","Detailed Risk Analysis","Investment Signal"]:["Tokenomics Comparison","Team Credibility Matrix","Deep Risk Analysis","Full Recommendation"]).map(f => <div key={f} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}><I n="lock" s={10} c="#0d2030"/><span style={{ fontSize:11, color:"#1a4060" }}>{f}</span></div>)}
            <button onClick={onUnlock} style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#007AFF,#5856D6)", borderRadius:12, fontSize:14, fontWeight:700, color:"white", marginTop:12, boxShadow:"0 6px 22px rgba(0,122,255,.35)", cursor:"pointer", border:"none" }}>
              Unlock with TON → {PRICES[reportType]} TON
            </button>
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onShare} style={{ flex:1, padding:"11px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:11, fontSize:12, fontWeight:600, color:"#5a8090", display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer" }}><I n="share" s={13} c="#5a8090"/>Share</button>
          <button onClick={onChat} style={{ flex:1, padding:"11px", background:"rgba(0,122,255,.09)", border:"1px solid rgba(0,122,255,.19)", borderRadius:11, fontSize:12, fontWeight:700, color:"#007AFF", display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer" }}><I n="chat" s={13} c="#007AFF"/>Ask AI</button>
          {isPremium && <div style={{ display:"flex", alignItems:"center", gap:5, padding:"11px 11px", background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.15)", borderRadius:11, fontSize:10, color:"#4ade80", fontWeight:700 }}><I n="check" s={12} c="#4ade80"/>Saved</div>}
        </div>
      </div>
    </div>
  );
}

// ─── REPORT CONTENT COMPONENTS ────────────────────────────────────────────────
function ProjContent({ report, isPremium }) {
  return <>
    <div style={{ padding:14, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:13, animation:"fadeIn .4s ease" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:11, marginBottom:11 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:19, fontWeight:900, color:"#d5ecff", letterSpacing:"-0.02em" }}>{report.name||"Project"}</div>
          {report.category&&<div style={{ fontSize:10, color:"#1a4060", marginTop:2 }}>{report.category}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
          {report.verdict&&<VerdictBadge verdict={report.verdict}/>}
          {report.verdict&&<RiskGauge verdict={report.verdict}/>}
        </div>
      </div>
      <p style={{ fontSize:13, color:"#4a7585", lineHeight:1.75 }}>{report.summary}</p>
    </div>
    {report.what_it_does&&<Sct title="What It Does" icon="bolt" color="#007AFF"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.what_it_does}</p></Sct>}
    {report.ecosystem_fit&&<Sct title="TON Ecosystem Fit" icon="shield" color="#5856D6"><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.ecosystem_fit}</p></Sct>}
    {report.strengths&&<Sct title="Strengths" icon="trending_up" color="#4ade80"><Bls items={report.strengths} c="#4ade80" i="check"/></Sct>}
    {report.risks&&<Sct title="Risk Flags" icon="warning" color="#f87171"><Bls items={report.risks} c="#f87171" i="warning"/></Sct>}
    {report.fit&&<Rw label="Best Suited For" val={report.fit}/>}
    {isPremium&&<>
      {report.bull_case&&<Sct title="Bull Case" icon="trending_up" color="#4ade80" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bull_case}</p></Sct>}
      {report.bear_case&&<Sct title="Bear Case" icon="trending_down" color="#f87171" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.bear_case}</p></Sct>}
      {report.risk_matrix&&<RiskMx matrix={report.risk_matrix}/>}
      {report.narrative&&<Sct title="Community & Narrative" icon="star" color="#fbbf24" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.narrative}</p></Sct>}
      <InvLens report={report}/>
      {report.final_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.1em"}}>Final Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.final_recommendation}</p></div>}
    </>}
  </>;
}

function WalContent({ report, isPremium }) {
  return <>
    <div style={{ padding:14, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:13, animation:"fadeIn .4s ease" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:11, marginBottom:11 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#c0dcf0", fontFamily:"monospace" }}>{(report.address||"").slice(0,22)}...</div>
          {report.type&&<div style={{ fontSize:11, color:"#007AFF", marginTop:3, fontWeight:600 }}>{report.type}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
          {report.risk_level&&<VerdictBadge verdict={report.risk_level}/>}
          {report.risk_level&&<RiskGauge verdict={report.risk_level}/>}
        </div>
      </div>
      <p style={{ fontSize:13, color:"#4a7585", lineHeight:1.75 }}>{report.activity}</p>
    </div>
    {report.patterns&&<Sct title="Behavioral Patterns" icon="chart" color="#5856D6"><Bls items={report.patterns} c="#a78bfa" i="info"/></Sct>}
    {report.notable&&<Sct title="Notable Activity" icon="star" color="#fbbf24"><Bls items={report.notable} c="#fbbf24" i="bolt"/></Sct>}
    <Rw label="Risk Assessment" val={report.risk}/>
    {isPremium&&<>
      {report.behavior_profile&&<Sct title="Behavioral Archetype" icon="shield" color="#007AFF" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.behavior_profile}</p></Sct>}
      {report.deep_risk_analysis&&<Sct title="Deep Risk Analysis" icon="warning" color="#f87171" pro><p style={{fontSize:13,color:"#4a7585",lineHeight:1.7}}>{report.deep_risk_analysis}</p></Sct>}
      {report.interaction_map&&<IntMp map={report.interaction_map}/>}
      {report.recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.1em"}}>Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.recommendation}</p></div>}
    </>}
  </>;
}

function CmpContent({ report, isPremium }) {
  return <>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, animation:"fadeIn .4s ease" }}>
      {[{name:report.project_a_name,v:report.verdict_a,ci:"0,122,255"},{name:report.project_b_name,v:report.verdict_b,ci:"175,82,222"}].map((p,i)=><div key={i} style={{padding:12,background:`rgba(${p.ci},.07)`,border:`1px solid rgba(${p.ci},.15)`,borderRadius:13,textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:`rgb(${p.ci})`,marginBottom:7}}>{p.name}</div>{p.v&&<><VerdictBadge verdict={p.v}/><div style={{marginTop:7}}><RiskGauge verdict={p.v}/></div></>}</div>)}
    </div>
    {report.summary&&<div style={{padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13}}><p style={{fontSize:13,color:"#4a7585",lineHeight:1.75}}>{report.summary}</p></div>}
    {report.utility_comparison&&<CRw label="Utility" a={report.utility_comparison.a} b={report.utility_comparison.b} winner={report.utility_comparison.winner}/>}
    {report.risk_comparison&&<CRw label="Risk Profile" a={report.risk_comparison.a} b={report.risk_comparison.b} winner={report.risk_comparison.lower_risk} wl="Lower Risk"/>}
    {report.strengths_a&&report.strengths_b&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Sct title={report.project_a_name} icon="trending_up" color="#007AFF" compact><Bls items={report.strengths_a} c="#007AFF" i="check" sm/></Sct><Sct title={report.project_b_name} icon="trending_up" color="#AF52DE" compact><Bls items={report.strengths_b} c="#AF52DE" i="check" sm/></Sct></div>}
    {[{l:"Conservative",k:"best_for_conservative"},{l:"Speculative",k:"best_for_speculative"}].map(r=>report[r.k]&&<Rw key={r.k} label={r.l} val={report[r.k]}/>)}
    {isPremium&&report.overall_recommendation&&<div style={{padding:12,background:"rgba(0,122,255,.07)",border:"1px solid rgba(0,122,255,.15)",borderRadius:12}}><div style={{fontSize:9,color:"#007AFF",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.1em"}}>Overall Recommendation</div><p style={{fontSize:13,color:"#5a8095",lineHeight:1.65}}>{report.overall_recommendation}</p></div>}
  </>;
}

// ─── AI CHAT DRAWER ───────────────────────────────────────────────────────────
function ChatDrawer({ report, onClose }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:`Hi! I've analyzed ${report.name||report.address||report.project_a_name||"this report"}. Ask me anything — risks, outlook, comparisons, what to watch. 👋` }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottom = useRef(null);
  const sugg = ["Is this safe to invest in?","Biggest red flags?","Compare to Ethereum DeFi","1-sentence verdict"];
  useEffect(()=>{ bottom.current?.scrollIntoView({behavior:"smooth"}); },[msgs,thinking]);
  const send = async (text) => {
    const m=text||input.trim(); if(!m||thinking)return;
    setInput(""); const nm=[...msgs,{role:"user",content:m}]; setMsgs(nm); setThinking(true);
    const reply=await chatWithAI(nm,report);
    setMsgs(prev=>[...prev,{role:"assistant",content:reply}]); setThinking(false);
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.9)", backdropFilter:"blur(16px)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ background:"#0b1421", borderRadius:"22px 22px 0 0", border:"1px solid rgba(255,255,255,.08)", borderBottom:"none", maxHeight:"92vh", display:"flex", flexDirection:"column", animation:"slideUp .35s ease" }}>
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid rgba(255,255,255,.055)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"rgba(0,122,255,.13)", display:"flex", alignItems:"center", justifyContent:"center" }}><I n="chat" s={16} c="#007AFF"/></div>
          <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:800, color:"#c8e4f8" }}>Ask AI</div><div style={{ fontSize:9, color:"#0d2a40", marginTop:1 }}>TONLens Intelligence</div></div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)", borderRadius:9, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer" }}><I n="close" s={14} c="#4a6070"/></button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10, minHeight:180, maxHeight:"48vh" }}>
          {msgs.map((m,i)=><div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"fadeIn .3s ease" }}><div style={{ maxWidth:"82%", padding:"9px 13px", borderRadius:m.role==="user"?"17px 17px 4px 17px":"17px 17px 17px 4px", background:m.role==="user"?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.055)", border:m.role==="assistant"?"1px solid rgba(255,255,255,.07)":"none", fontSize:13, color:m.role==="user"?"white":"#90b8d0", lineHeight:1.6 }}>{m.content}</div></div>)}
          {thinking&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"17px 17px 17px 4px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.07)",display:"flex",gap:5}}>{[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:"#007AFF",animation:`typing 1.2s ease ${j*.2}s infinite`}}/>)}</div></div>}
          <div ref={bottom}/>
        </div>
        <div style={{ padding:"7px 13px", display:"flex", gap:6, overflowX:"auto" }}>
          {sugg.map(s=><button key={s} onClick={()=>send(s)} style={{ padding:"5px 10px", borderRadius:14, background:"rgba(0,122,255,.09)", border:"1px solid rgba(0,122,255,.18)", fontSize:10, color:"#007AFF", whiteSpace:"nowrap", fontWeight:600, cursor:"pointer" }}>{s}</button>)}
        </div>
        <div style={{ padding:"8px 14px 28px", display:"flex", gap:8, alignItems:"center" }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything about this report..." style={{ flex:1, padding:"11px 13px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:13, fontSize:12, color:"#c8e4f8", outline:"none" }}/>
          <button onClick={()=>send()} style={{ width:40, height:40, borderRadius:12, background:input.trim()?"linear-gradient(135deg,#007AFF,#5856D6)":"rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", flexShrink:0 }}><I n="send" s={15} c={input.trim()?"white":"#1a3040"}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY SCREEN ───────────────────────────────────────────────────────────
function HistoryScreen({ history, onBack, onOpen, user }) {
  return (
    <div style={{ minHeight:"100vh", paddingBottom:40 }}>
      <Hdr title="Research History" sub={`${history.length} reports · ${user&&user.source!=="guest"?user.firstName+"'s account":"Guest session"}`} onBack={onBack} ii="history" ic="#8899aa"/>
      <div style={{ padding:14 }}>
        {history.length===0 ? <div style={{textAlign:"center",padding:"70px 20px"}}><I n="history" s={40} c="#081520"/><div style={{fontSize:13,color:"#0d1e2e",marginTop:14}}>No research yet</div><div style={{fontSize:11,color:"#08111a",marginTop:5}}>Start analyzing TON projects</div></div> :
        history.map((h,i)=><div key={h.id} onClick={()=>onOpen(h)} style={{display:"flex",alignItems:"center",padding:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:13,cursor:"pointer",gap:10,marginBottom:6,animation:`fadeIn .3s ease ${i*.05}s both`}}><div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={h.type==="wallet"?"wallet":h.type==="compare"?"compare":"chart"} s={16} c="#1a3a50"/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#85aac0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div><div style={{fontSize:9,color:"#0d2030",marginTop:2}}>{h.date} · {h.type}</div></div>{h.premium&&<span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,.1)",padding:"2px 6px",borderRadius:8,flexShrink:0}}>PRO</span>}</div>)}
      </div>
    </div>
  );
}

// ─── PAYMENT SCREEN ───────────────────────────────────────────────────────────
function PaymentScreen({ reportType, price, onConfirm, onCancel, walletAddress }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.9)", backdropFilter:"blur(16px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#0b1421", borderRadius:"22px 22px 0 0", padding:"20px 18px 42px", border:"1px solid rgba(255,255,255,.08)", borderBottom:"none", animation:"slideUp .35s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:17 }}>
          <div style={{ fontSize:16, fontWeight:800 }}>Confirm TON Payment</div>
          <button onClick={onCancel} style={{ background:"rgba(255,255,255,.06)", borderRadius:9, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer" }}><I n="close" s={14} c="#4a6070"/></button>
        </div>
        <div style={{ padding:13, background:"rgba(255,255,255,.04)", borderRadius:13, marginBottom:12 }}>
          {[["Report Type",`Premium ${reportType}`],["From Wallet",walletAddress],["Network","TON Mainnet"],["Amount",`${price} TON`]].map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:i<3?8:0,paddingBottom:i===2?8:0,borderBottom:i===2?"1px solid rgba(255,255,255,.06)":"none"}}><span style={{fontSize:12,color:"#2a5060"}}>{l}</span><span style={{fontSize:i===3?19:11,fontWeight:i===3?800:600,color:i===3?"#007AFF":i===1?"#4ade80":"#90b8d0",fontFamily:i===1?"monospace":"inherit"}}>{v}</span></div>)}
        </div>
        <div style={{ padding:11, background:"rgba(0,122,255,.07)", borderRadius:10, marginBottom:14, display:"flex", gap:8, alignItems:"flex-start" }}>
          <I n="info" s={13} c="#007AFF"/>
          <span style={{ fontSize:11, color:"#1a4060", lineHeight:1.5 }}>A cryptographic receipt will be recorded on-chain. AI-generated research — not financial advice.</span>
        </div>
        <button onClick={onConfirm} style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,#007AFF,#5856D6)", borderRadius:13, fontSize:14, fontWeight:700, color:"white", boxShadow:"0 8px 28px rgba(0,122,255,.4)", cursor:"pointer", border:"none" }}>
          Pay {price} TON via TON Connect
        </button>
        <button onClick={onCancel} style={{ width:"100%", padding:"11px", background:"none", border:"none", fontSize:12, color:"#1a3050", marginTop:6, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
function ShareModal({ report, reportType, onClose, showToast }) {
  const [copied, setCopied] = useState(false);
  const text = reportType==="project" ? `🔍 TONLens: ${report.name||"Project"}\n📊 ${report.category||"TON"} · Risk: ${report.verdict||"?"}\n\n${report.summary?.slice(0,200)}...\n\n🔗 TONLens Research` : reportType==="wallet" ? `🔍 TONLens Wallet: ${(report.address||"").slice(0,18)}...\n👤 ${report.type||"?"} · Risk: ${report.risk_level||"?"}\n\n${report.activity?.slice(0,200)}...\n\n🔗 TONLens Research` : `⚖️ TONLens: ${report.project_a_name} vs ${report.project_b_name}\n\n${report.summary?.slice(0,200)}...\n\n🔗 TONLens Research`;
  const copy = () => { navigator.clipboard.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>{ setCopied(false); onClose(); showToast("Copied!","success"); },1500); }); };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.9)", backdropFilter:"blur(16px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#0b1421", borderRadius:"22px 22px 0 0", padding:"18px 16px 40px", border:"1px solid rgba(255,255,255,.08)", borderBottom:"none", animation:"slideUp .35s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:800 }}>Share Summary</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)", borderRadius:9, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer" }}><I n="close" s={14} c="#4a6070"/></button>
        </div>
        <div style={{ padding:12, background:"rgba(255,255,255,.04)", borderRadius:12, marginBottom:12, fontSize:11, color:"#4a7080", lineHeight:1.75, whiteSpace:"pre-line" }}>{text}</div>
        <button onClick={copy} style={{ width:"100%", padding:"13px", borderRadius:12, fontSize:13, fontWeight:700, background:copied?"rgba(34,197,94,.11)":"linear-gradient(135deg,#007AFF,#5856D6)", color:copied?"#4ade80":"white", border:copied?"1px solid rgba(34,197,94,.26)":"none", display:"flex", alignItems:"center", justifyContent:"center", gap:7, cursor:"pointer" }}>
          {copied?<><I n="check" s={14} c="#4ade80"/>Copied!</>:<><I n="copy" s={14} c="white"/>Copy to Clipboard</>}
        </button>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ active, onNavigate, user }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(6,10,18,.97)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", padding:"7px 0 20px", zIndex:100 }}>
      {[{k:"home",i:"home",l:"Home"},{k:"project",i:"chart",l:"Research"},{k:"wallet",i:"wallet",l:"Wallet"},{k:"history",i:"history",l:"History"}].map(item=>(
        <button key={item.k} onClick={()=>onNavigate(item.k)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", padding:"5px 4px", cursor:"pointer" }}>
          {item.k==="history"&&user&&user.source!=="guest" ? (
            <div style={{ position:"relative" }}>
              <I n={item.i} s={20} c={active===item.k?"#007AFF":"#0d1e2e"}/>
              <div style={{ position:"absolute", top:-3, right:-3, width:8, height:8, borderRadius:"50%", background:"#007AFF", border:"2px solid #060a12" }}/>
            </div>
          ) : <I n={item.i} s={20} c={active===item.k?"#007AFF":"#0d1e2e"}/>}
          <span style={{ fontSize:9, color:active===item.k?"#007AFF":"#0d1e2e", fontWeight:active===item.k?700:400, letterSpacing:"0.04em" }}>{item.l}</span>
          {active===item.k&&<div style={{width:4,height:4,borderRadius:"50%",background:"#007AFF",marginTop:-1}}/>}
        </button>
      ))}
    </div>
  );
}

// ─── SHARED UI ATOMS ──────────────────────────────────────────────────────────
function Hdr({ title, sub, onBack, ii, ic, badge }) {
  return (
    <div style={{ padding:"12px 14px 11px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", gap:10 }}>
      <button onClick={onBack} style={{ background:"rgba(255,255,255,.06)", borderRadius:10, width:35, height:35, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", flexShrink:0 }}><I n="back" s={17} c="#4a6070"/></button>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:15, fontWeight:800, color:"#c5e0f5" }}>{title}</span>
          {badge&&<span style={{ fontSize:9, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 7px", borderRadius:8 }}>{badge}</span>}
        </div>
        <div style={{ fontSize:10, color:"#0d1e30", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>
      </div>
      <div style={{ width:35, height:35, borderRadius:10, background:`${ic}12`, display:"flex", alignItems:"center", justifyContent:"center" }}><I n={ii} s={16} c={ic}/></div>
    </div>
  );
}

function Sct({ title, icon, color, children, pro, compact }) {
  return (
    <div style={{ padding:compact?10:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <I n={icon} s={12} c={color}/>
        <span style={{ fontSize:compact?11:12, fontWeight:700, color:"#85aac0" }}>{title}</span>
        {pro&&<span style={{ marginLeft:"auto", fontSize:8, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 6px", borderRadius:7 }}>PRO</span>}
      </div>
      {children}
    </div>
  );
}

function Bls({ items, c, i, sm }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:sm?4:6 }}>{items?.map((item,j)=><div key={j} style={{display:"flex",gap:7,alignItems:"flex-start"}}><div style={{flexShrink:0,marginTop:2}}><I n={i} s={10} c={c}/></div><span style={{fontSize:sm?10:11,color:"#3a6070",lineHeight:1.65}}>{item}</span></div>)}</div>;
}

function Rw({ label, val }) {
  return <div style={{ padding:"9px 12px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:11, display:"flex", gap:9, alignItems:"flex-start" }}><span style={{ fontSize:9, color:"#0d2030", minWidth:84, flexShrink:0, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span><span style={{ fontSize:11, color:"#3a6070", lineHeight:1.6 }}>{val}</span></div>;
}

function CRw({ label, a, b, winner, wl="Better" }) {
  return (
    <div style={{ padding:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12 }}>
      <div style={{ fontSize:9, color:"#0d2030", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{label}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:7, alignItems:"start" }}>
        <span style={{ fontSize:11, color:"#4a7090", lineHeight:1.55 }}>{a}</span>
        <span style={{ fontSize:9, color:winner==="Tie"?"#fbbf24":"#4ade80", fontWeight:700, background:"rgba(255,255,255,.05)", padding:"3px 7px", borderRadius:7, textAlign:"center", whiteSpace:"nowrap", alignSelf:"center" }}>{winner==="Tie"?"Tie":winner==="A"?`◄ ${wl}`:`${wl} ►`}</span>
        <span style={{ fontSize:11, color:"#8860aa", lineHeight:1.55, textAlign:"right" }}>{b}</span>
      </div>
    </div>
  );
}

function RiskMx({ matrix }) {
  const vc={Low:"#4ade80",Medium:"#fbbf24",High:"#f87171"}, vw={Low:"28%",Medium:"58%",High:"88%"};
  return (
    <div style={{ padding:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:11 }}><I n="shield" s={11} c="#007AFF"/><span style={{ fontSize:12, fontWeight:700, color:"#85aac0" }}>Risk Matrix</span><span style={{ marginLeft:"auto", fontSize:8, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 6px", borderRadius:7 }}>PRO</span></div>
      {matrix.map((row,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:10,color:"#1a3a50",width:80,flexShrink:0}}>{row.area}</span><div style={{flex:1,height:5,borderRadius:3,background:"rgba(255,255,255,.05)"}}><div style={{height:"100%",borderRadius:3,background:vc[row.level]||"#fbbf24",width:vw[row.level]||"50%",transition:"width 1s ease",boxShadow:`0 0 7px ${vc[row.level]||"#fbbf24"}70`}}/></div><span style={{fontSize:9,color:vc[row.level]||"#fbbf24",fontWeight:700,width:38,textAlign:"right"}}>{row.level}</span></div>)}
    </div>
  );
}

function InvLens({ report }) {
  const ps=[{k:"conservative_view",i:"shield",c:"#4ade80",l:"Conservative"},{k:"speculative_view",i:"bolt",c:"#fbbf24",l:"Speculative"},{k:"explorer_view",i:"search",c:"#a78bfa",l:"Explorer"}];
  if(!ps.some(p=>report[p.k]))return null;
  return (
    <div style={{ padding:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:11 }}><I n="star" s={11} c="#fbbf24"/><span style={{ fontSize:12, fontWeight:700, color:"#85aac0" }}>Investor Lens</span><span style={{ marginLeft:"auto", fontSize:8, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 6px", borderRadius:7 }}>PRO</span></div>
      {ps.map(p=>report[p.k]&&<div key={p.k} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10}}><div style={{width:24,height:24,borderRadius:7,background:`${p.c}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={p.i} s={11} c={p.c}/></div><div><div style={{fontSize:8,color:p.c,fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{p.l}</div><div style={{fontSize:11,color:"#3a6070",lineHeight:1.65}}>{report[p.k]}</div></div></div>)}
    </div>
  );
}

function IntMp({ map }) {
  const fc={High:"#4ade80",Medium:"#fbbf24",Low:"#1a3a50"};
  return (
    <div style={{ padding:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.055)", borderRadius:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}><I n="chart" s={11} c="#5856D6"/><span style={{ fontSize:12, fontWeight:700, color:"#85aac0" }}>Protocol Interactions</span><span style={{ marginLeft:"auto", fontSize:8, color:"#fbbf24", fontWeight:700, background:"rgba(251,191,36,.1)", padding:"2px 6px", borderRadius:7 }}>PRO</span></div>
      {map.map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:12,color:"#90b8d0",fontWeight:600,flex:1}}>{item.protocol}</span><span style={{fontSize:9,color:"#1a3a50",background:"rgba(255,255,255,.04)",padding:"2px 7px",borderRadius:6}}>{item.type}</span><span style={{fontSize:9,color:fc[item.frequency]||"#fbbf24",fontWeight:700}}>{item.frequency}</span></div>)}
    </div>
  );
}

function Lbl({ t, noMb }) {
  return <div style={{ fontSize:9, color:"#08161f", letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:noMb?0:8 }}>{t}</div>;
}

function Btn({ label, dis, onClick, color }) {
  return <button disabled={dis} onClick={onClick} style={{ padding:"15px", background:dis?"rgba(255,255,255,.05)":`linear-gradient(135deg,${color},${color}88)`, borderRadius:14, fontSize:14, fontWeight:700, color:dis?"#0d2030":"white", marginTop:7, boxShadow:dis?"none":`0 8px 24px ${color}3a`, cursor:dis?"not-allowed":"pointer", border:"none", width:"100%", transition:"all .2s" }}>{label}</button>;
}

function Fld({ label, ph, val, set, mono }) {
  return (
    <div>
      <label style={{ fontSize:9, color:"#08161f", fontWeight:700, display:"block", marginBottom:5, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</label>
      <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{ width:"100%", padding:"12px 13px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, fontSize:12, color:"#c5e0f5", fontFamily:mono?"monospace":"inherit", outline:"none", transition:"border-color .2s" }}
        onFocus={e=>e.target.style.borderColor="rgba(0,122,255,.4)"}
        onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.08)"}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT APP ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function TONLens() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [screen, setScreen] = useState("login");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [report, setReportState] = useState(null);
  const [reportType, setReportType] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing...");
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [paymentScreen, setPaymentScreen] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tonStats, setTonStats] = useState({ price:"5.24", change:"2.1", mcap:"13.2B" });

  // ── Init: check Telegram Mini App auth first ──────────────────────────────
  useEffect(() => {
    // Load Telegram WebApp SDK
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        const tgUser = getTelegramWebAppUser();
        if (tgUser) {
          setUser(tgUser);
          setScreen("home");
        }
      }
      setAuthChecked(true);
    };
    script.onerror = () => setAuthChecked(true);
    document.head.appendChild(script);

    fetchTONStats().then(setTonStats);
    const iv = setInterval(()=>fetchTONStats().then(setTonStats), 60000);
    return () => clearInterval(iv);
  }, []);

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleLogin = (userData) => {
    setUser(userData);
    setScreen("home");
    if (userData.source !== "guest") showToast(`Welcome, ${userData.firstName}! 👋`, "success");
    else showToast("Continuing as guest", "info");
  };

  const handleLogout = () => {
    setUser(null);
    setScreen("login");
    setHistory([]);
    showToast("Signed out successfully");
  };

  const connectWallet = () => {
    setLoading(true); setLoadingText("Connecting via TON Connect...");
    setTimeout(()=>{ setWalletAddress("UQBFam...kR9x"); setWalletConnected(true); setLoading(false); showToast("Wallet connected!","success"); },1800);
  };

  const saveHistory = (rpt, type) => setHistory(prev=>[{id:Date.now(),type,name:rpt.name||rpt.address||rpt.project_a_name||"Report",date:new Date().toLocaleDateString(),premium:false,report:rpt},...prev.slice(0,19)]);

  const runReport = async (type, input) => {
    setLoading(true);
    const steps = { project:["Fetching project data...","Running AI analysis...","Building risk profile..."], wallet:["Scanning blockchain...","Profiling behavior...","Scoring risk..."], compare:["Analyzing Project A...","Analyzing Project B...","Building comparison..."] };
    const s=steps[type]; setLoadingText(s[0]);
    setTimeout(()=>setLoadingText(s[1]),900); setTimeout(()=>setLoadingText(s[2]),1800);
    let rpt;
    try {
      if(type==="project") rpt=await generateProjectReport(input);
      else if(type==="wallet") rpt=await generateWalletReport(input);
      else rpt=await generateCompareReport(input.a,input.b);
    } catch {
      rpt = type==="project" ? DEMO_PROJECTS.dedust : type==="wallet" ? {address:input,type:"Active Trader",activity:"Demo wallet — consistent DeFi activity.",patterns:["Regular DEX usage","NFT participation"],risk:"Low risk",risk_level:"Low",notable:["Active since 2022"]} : {project_a_name:input.a?.project_name||"A",project_b_name:input.b?.project_name||"B",summary:"Side-by-side comparison.",utility_comparison:{a:"Utility A",b:"Utility B",winner:"Tie"},risk_comparison:{a:"Medium",b:"Medium",lower_risk:"Tie"},verdict_a:"Medium",verdict_b:"Medium",best_for_conservative:"A",best_for_speculative:"B",strengths_a:["Strong"],strengths_b:["Innovative"]};
    }
    rpt._input=input; rpt._type=type;
    setReportState(rpt); setReportType(type); setIsPremium(false);
    saveHistory(rpt,type); setLoading(false); setScreen("report");
  };

  const handleUnlock = () => { if(!walletConnected){showToast("Connect your wallet first","warning");return;} setPaymentScreen(true); };

  const confirmPayment = async () => {
    setPaymentScreen(false); setLoading(true); setLoadingText("Processing payment...");
    setTimeout(()=>setLoadingText("Generating premium insights..."),1200);
    let pr;
    try {
      if(reportType==="project") pr=await generateProjectReport(report._input||{project_name:report.name},true);
      else if(reportType==="wallet") pr=await generateWalletReport(report.address||report._input,true);
      else pr=await generateCompareReport({project_name:report.project_a_name},{project_name:report.project_b_name},true);
    } catch { pr={...report}; }
    pr._input=report._input; pr._type=reportType;
    setReportState(pr); setIsPremium(true); setLoading(false);
    showToast("Premium unlocked! Receipt saved on-chain.","success");
  };

  // ── Don't render until auth check done ───────────────────────────────────
  if (!authChecked) return (
    <div style={{ background:"#070b14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Loader text="Initializing TONLens..."/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:"#070b14", minHeight:"100vh", color:"#d0eaff", maxWidth:430, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,textarea{outline:none}button{cursor:pointer;border:none;outline:none}::-webkit-scrollbar{width:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,122,255,.22),0 0 0 1px rgba(0,122,255,.25)}50%{box-shadow:0 0 50px rgba(0,122,255,.5),0 0 0 1px rgba(0,122,255,.4)}}@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>

      {/* Ambient bg */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:-100, right:-80, width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,122,255,.06) 0%,transparent 70%)" }}/>
        <div style={{ position:"absolute", bottom:0, left:-80, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(88,86,214,.04) 0%,transparent 70%)" }}/>
      </div>

      {/* Toast */}
      {toast && <div style={{ position:"fixed", top:13, left:"50%", transform:"translateX(-50%)", zIndex:1000, background:toast.type==="success"?"rgba(34,197,94,.1)":toast.type==="warning"?"rgba(234,179,8,.1)":"rgba(255,255,255,.07)", border:`1px solid ${toast.type==="success"?"rgba(34,197,94,.24)":toast.type==="warning"?"rgba(234,179,8,.24)":"rgba(255,255,255,.12)"}`, borderRadius:12, padding:"9px 17px", fontSize:13, color:"#c0dcf0", backdropFilter:"blur(12px)", animation:"fadeIn .2s ease", maxWidth:300, textAlign:"center" }}>{toast.msg}</div>}

      {/* Modals */}
      {shareModal && report && <ShareModal report={report} reportType={reportType} onClose={()=>setShareModal(false)} showToast={showToast}/>}
      {paymentScreen && !loading && <PaymentScreen reportType={reportType} price={PRICES[reportType]} onConfirm={confirmPayment} onCancel={()=>setPaymentScreen(false)} walletAddress={walletAddress}/>}
      {chatOpen && report && <ChatDrawer report={report} reportType={reportType} onClose={()=>setChatOpen(false)}/>}

      <div style={{ position:"relative", zIndex:1 }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><Loader text={loadingText}/></div>
        ) : screen==="login" ? (
          <LoginScreen onLogin={handleLogin} tonStats={tonStats}/>
        ) : screen==="home" ? (
          <HomeScreen user={user} walletConnected={walletConnected} walletAddress={walletAddress} onConnect={connectWallet} onDisconnect={()=>{setWalletConnected(false);setWalletAddress("");showToast("Wallet disconnected");}} onNavigate={s=>{ if(s==="login"){handleLogout();}else{setScreen(s);} }} history={history} tonStats={tonStats} setReport={(r,t,p)=>{setReportState(r);setReportType(t);setIsPremium(p||false);setScreen("report");}}/>
        ) : screen==="project" ? (
          <ProjectScreen onBack={()=>setScreen("home")} onSubmit={input=>runReport("project",input)}/>
        ) : screen==="wallet" ? (
          <WalletScreen onBack={()=>setScreen("home")} onSubmit={addr=>runReport("wallet",addr)}/>
        ) : screen==="compare" ? (
          <CompareScreen onBack={()=>setScreen("home")} onSubmit={(a,b)=>runReport("compare",{a,b})}/>
        ) : screen==="report" && report ? (
          <ReportScreen report={report} reportType={reportType} isPremium={isPremium} onBack={()=>setScreen("home")} onUnlock={handleUnlock} onShare={()=>setShareModal(true)} onChat={()=>setChatOpen(true)}/>
        ) : screen==="history" ? (
          <HistoryScreen history={history} onBack={()=>setScreen("home")} onOpen={e=>{setReportState(e.report);setReportType(e.type);setIsPremium(e.premium);setScreen("report");}} user={user}/>
        ) : null}
      </div>
    </div>
  );
}
