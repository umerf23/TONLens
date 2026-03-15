// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ton-lens.vercel.app";

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || "";
    const firstName = message.from?.first_name || "there";

    if (text === "/start") {
      await sendMessage(
        chatId,
        `👋 <b>Welcome to TONLens, ${firstName}!</b>\n\n🔍 AI-powered research for the TON ecosystem.\n\n<b>What you can do:</b>\n• Analyze any TON project with AI\n• Profile wallets & score risk\n• Compare projects side-by-side\n• Unlock premium reports with TON\n\nTap the button below to open TONLens 👇`,
        {
          inline_keyboard: [[
            {
              text: "🚀 Open TONLens",
              web_app: { url: APP_URL },
            },
          ]],
        }
      );
    } else if (text === "/research") {
      await sendMessage(
        chatId,
        `📊 <b>Project Research</b>\n\nAnalyze any TON project with AI — get risk score, strengths, risks, and premium insights.\n\nOpen TONLens and tap <b>Research</b> 👇`,
        {
          inline_keyboard: [[
            { text: "🔍 Analyze Project", web_app: { url: `${APP_URL}` } },
          ]],
        }
      );
    } else if (text === "/wallet") {
      await sendMessage(
        chatId,
        `💼 <b>Wallet Analysis</b>\n\nProfile any TON wallet — behavioral patterns, risk score, protocol interactions.\n\nOpen TONLens and tap <b>Wallet</b> 👇`,
        {
          inline_keyboard: [[
            { text: "💼 Analyze Wallet", web_app: { url: `${APP_URL}` } },
          ]],
        }
      );
    } else if (text === "/compare") {
      await sendMessage(
        chatId,
        `⚖️ <b>Compare Projects</b>\n\nCompare two TON projects side by side — utility, risk, tokenomics, team.\n\nOpen TONLens and tap <b>Compare</b> 👇`,
        {
          inline_keyboard: [[
            { text: "⚖️ Compare Now", web_app: { url: `${APP_URL}` } },
          ]],
        }
      );
    } else if (text === "/help") {
      await sendMessage(
        chatId,
        `ℹ️ <b>TONLens Commands</b>\n\n/start — Launch TONLens\n/research — Analyze a TON project\n/wallet — Analyze a wallet\n/compare — Compare two projects\n/help — Show this message\n\n💎 <b>Premium reports</b> unlock with TON payment\n🔐 <b>Login</b> with your TON wallet — no password needed`,
        {
          inline_keyboard: [[
            { text: "🚀 Open TONLens", web_app: { url: APP_URL } },
          ]],
        }
      );
    } else {
      // Default response for unknown messages
      await sendMessage(
        chatId,
        `🤖 Use /start to launch TONLens or tap below 👇`,
        {
          inline_keyboard: [[
            { text: "🚀 Open TONLens", web_app: { url: APP_URL } },
          ]],
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "TONLens webhook active ✅" });
}