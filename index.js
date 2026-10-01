import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ QOZBOT CONNECTED!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("❌ Connection closed");

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        startBot();
      } else {
        console.log("⚠️ WhatsApp logged out.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    console.log(`📩 ${from}: ${text}`);

    if (command === ".ping") {
      await sock.sendMessage(from, {
        text: "🏓 Pong!\n\nQozBot is alive ✅"
      });
    }

    if (command === ".alive") {
      await sock.sendMessage(from, {
        text: "🤖 QozBot is online!\n\n⚡ Powered by QozTech"
      });
    }

    if (command === ".menu") {
      await sock.sendMessage(from, {
        text: `╭━━━〔 🤖 QOZBOT 〕━━━╮
┃
┃ 👋 Hello!
┃
┃ 📌 Available Commands
┃
┃ .ping
┃ .alive
┃ .menu
┃ .owner
┃
╰━━━━━━━━━━━━━━━━━━╯`
      });
    }

    if (command === ".owner") {
      await sock.sendMessage(from, {
        text: "👑 Owner: Qozeem\n\n🤖 QozBot"
      });
    }

    if (command.startsWith(".say ")) {
      const message = text.slice(5);

      await sock.sendMessage(from, {
        text: message
      });
    }
  });
}

startBot();
