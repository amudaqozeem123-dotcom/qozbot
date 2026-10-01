import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Render health check
app.get("/", (req, res) => {
  res.status(200).send("QozBot is running 🤖");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 QozBot server running on port ${PORT}`);
});

async function startBot() {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: "silent" }),
      printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log("✅ QOZBOT CONNECTED TO WHATSAPP!");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log("❌ WhatsApp connection closed:", statusCode);

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log("🔄 Reconnecting in 5 seconds...");

          setTimeout(() => {
            startBot();
          }, 5000);
        } else {
          console.log("⚠️ WhatsApp logged out.");
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];

      if (!msg?.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command = text.trim().toLowerCase();

      console.log(`📩 ${text}`);

      if (command === ".ping") {
        await sock.sendMessage(from, {
          text: "🏓 Pong!\n\nQozBot is alive ✅"
        });
      }

      if (command === ".alive") {
        await sock.sendMessage(from, {
          text: "🤖 QozBot is online!"
        });
      }

      if (command === ".menu") {
        await sock.sendMessage(from, {
          text: `╭━━━〔 🤖 QOZBOT 〕━━━╮
┃
┃ .ping
┃ .alive
┃ .menu
┃ .owner
┃ .say
┃
╰━━━━━━━━━━━━━━━━━━╯`
        });
      }

      if (command === ".owner") {
        await sock.sendMessage(from, {
          text: "👑 Owner: Qozeem\n🤖 Bot: QozBot"
        });
      }

      if (command.startsWith(".say ")) {
        await sock.sendMessage(from, {
          text: text.slice(5)
        });
      }
    });

  } catch (error) {
    console.error("BOT ERROR:", error);

    setTimeout(() => {
      startBot();
    }, 5000);
  }
}

startBot();
