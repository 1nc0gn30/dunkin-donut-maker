import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Google GenAI
  const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Stub out in-memory state for collaborative shoutouts
  interface Shout {
    id: string;
    authorType: 'customer' | 'employee';
    authorName: string;
    targetName: string;
    message: string;
    badge: string;
    likes: number;
    createdAt: string;
  }

  let shouts: Shout[] = [
    {
      id: "1",
      authorType: "customer",
      authorName: "Hyperactive Dave",
      targetName: "Brenda (Midnight Drive-Thru)",
      message: "Brenda brewed a pristine batch of Hazelnut Extra-Charged at 2:15 AM just for my coding session. She literally saved my startup from total collapse. Give this woman a medieval shield and a crown!",
      badge: "Espresso Speedrunner",
      likes: 18,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: "2",
      authorType: "employee",
      authorName: "Sprinkle Queen Tanya",
      targetName: "Bobby 'Dozen' Smith",
      message: "Bobby ordered a standard 'Assorted Dozen' without asking for half-iced, double-filled custom layouts while we had a queue of 15 cars. Bobby is the absolute peak of customer civilization.",
      badge: "Angel Customer",
      likes: 12,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "3",
      authorType: "customer",
      authorName: "Trembling Tech Lead",
      targetName: "Marcus (Glaze Specialist)",
      message: "The Maple Frosted donut had such a perfect glaze distribution it looked like a $12,000 digital render. I didn't eat it immediately; I stared at it for 20 minutes while trembling with reverence. Stellar job!",
      badge: "Golden Glaze Hero",
      likes: 24,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "4",
      authorType: "employee",
      authorName: "Lee (Shift Lead)",
      targetName: "Salty-Carb Corner Team",
      message: "Shoutout to the team at the sandwich shop next door. They brought over a warm pile of hash browns in exchange for three piping hot Double-Shot Macchiatos. The local vendor alliance is unbreakable.",
      badge: "Double-Cup Defender",
      likes: 9,
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ];

  // Simulated Dispatch logs pool data
  const dispatchLogsPool = [
    "Location #421: Raccoon wearing a pink chocolate-dipped collar spotted checking dumpsters. He made polite eye contact and pointed at the drive-thru window.",
    "Location #012: Drive-thru microphone briefly tuned into a secret alien frequency. They requested six million glazed donuts or they will vaporize our decaf reserves.",
    "Location #188: Glaze pipeline valve clogged with 3.2 metric tons of chocolate hazelnut cream. Glaze masters have donned safety goggles and are diving in to manual-clear.",
    "Location #109: A customer tried to pay for a single munchkin with a 1999 holographic Charizard Card. Manager accepted. Store asset register values increased by 600%.",
    "Location #505: Espresso Machine #C is vibrating at a frequency that is harmonizing with the adjacent hardware store. Shovels are slowly ringing in response.",
    "Location #220: Customer successfully pronounced 'Macchiato' correctly on the first attempt. Shift crew applauded, confetti was blown.",
    "Location #099: Baker Marcus successfully achieved a spectacular triple-donut glaze flip while handing off a hot dozen. Customers cheered.",
    "Location #311: Ambient sensors detect a critical local surge in pumpkin-spice aroma. preparing to vent the main filters or fully surrender to the autumnal singularity."
  ];

  // Dispatch logs history
  let dispatchLogs = [
    { id: "d1", timestamp: new Date(Date.now() - 120000).toISOString(), text: "Location #188: Glaze pipeline valve clogged with 3.2 metric tons of chocolate hazelnut cream. Cleanup crews marshalled." },
    { id: "d2", timestamp: new Date(Date.now() - 60000).toISOString(), text: "Location #012: Customer tried to order a 'Venti Triple-Splashed Frappuccino with oat milk' in drive-thru and was gently guided back to our 'Medium Original'." },
    { id: "d3", timestamp: new Date().toISOString(), text: "Location #100: Sprinkle silos report 99.2% capacity. Glaze viscosity: maximum lusciousness." }
  ];

  // API Route: Get Shouts
  app.get("/api/shouts", (req, res) => {
    res.json(shouts);
  });

  // API Route: Post Shout
  app.post("/api/shouts", (req, res) => {
    const { authorType, authorName, targetName, message, badge } = req.body;
    if (!authorName?.trim() || !targetName?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Please fill in all shoutout fields!" });
    }
    const newShout: Shout = {
      id: String(Date.now()),
      authorType: authorType === "employee" ? "employee" : "customer",
      authorName: authorName.trim(),
      targetName: targetName.trim(),
      message: message.trim(),
      badge: badge || "Community Hero",
      likes: 0,
      createdAt: new Date().toISOString()
    };
    shouts.unshift(newShout);
    res.status(201).json(newShout);
  });

  // API Route: Like Shout
  app.post("/api/shouts/:id/like", (req, res) => {
    const shout = shouts.find(s => s.id === req.params.id);
    if (shout) {
      shout.likes += 1;
      res.json(shout);
    } else {
      res.status(404).json({ error: "Shout not found" });
    }
  });

  // API Route: Dispatch logs (simulate active store dispatch updates)
  app.get("/api/dispatch/logs", (req, res) => {
    // Randomly insert a new log occasionally (40% probability per poll) to keep things fresh
    if (Math.random() > 0.6 && dispatchLogs.length < 25) {
      const randTxt = dispatchLogsPool[Math.floor(Math.random() * dispatchLogsPool.length)];
      if (!dispatchLogs.some(l => l.text === randTxt)) {
        dispatchLogs.unshift({
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          text: randTxt
        });
      }
    }
    res.json(dispatchLogs.slice(0, 10));
  });

  // API Route: Scream into the Cup Analyzer (Gemini Call)
  app.post("/api/scream", async (req, res) => {
    const { rant, caffeineLevel } = req.body;
    if (!rant?.trim()) {
      return res.status(400).json({ error: "Scream box is empty! Produce some noise first." });
    }

    const level = Number(caffeineLevel) || 1;

    if (!ai) {
      // Hilarious offline mockup to maintain fully functional parody flow if API key is not present
      const fallbackQuotes = [
        "MY COMPUTER MOUSE IS MOVING AT RETINA SPEED. I AM EXCEL SHEET CHAMPION! THE CORE GLAZE ENGINE LIVES WITHIN ME!!!",
        "PUMP THOSE SPRINKLES!!! THREE MORE MINUTES TILL MEETING OUTBURST!!! HEARTRATE OVER 300!!!",
        "NO SLEEP! NOT UNTIL EXCEL FORMULAS ACHIEVE ABSOLUTE GLORIOUS PURITY! THE ICED COFFEE SEEDS IN MY BLOOD SYSTEM WILL NEVER DIE!!!",
        "I AM IN TUNE WITH THE GLUE DEPARTMENTS. WE MUST SYNCHRONIZE COFFEE DRINKERS WITH COFFEE ROASTERS IMMEDIATELY."
      ];
      const randomText = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      
      return res.json({
        translatedText: `[AUTO-ENERGY EMULATOR] ${randomText} YOUR CORE RANT: "${rant.toUpperCase()}"`,
        drinkRecommendation: `Extra-Charged Double-Stretched Turbo Espresso with 4 Pumps of Chocolate Whipped Glaze`,
        pulseSpeedHz: 120 + level * 45,
        vibeMetrics: {
          panicPct: Math.min(100, 25 + level * 15),
          productivityPct: 100 + level * 60,
          shakeFreq: `Vibe-Shift Stage ${level} Tremor (${level * 12}Hz Keyboard Wobble)`
        }
      });
    }

    try {
      const prompt = `You are the Dunkin' AI Overlord of Caffeinated Hustle, extreme speed-creativity, and donut-sprinkling excellence.
      A user has sent their "rant / scream / explanation of why they need coffee / work frustration" to our "Scream in the Cup" transducer.
      
      User's Rant Description: "${rant}"
      Their caffeinated cup intake today: ${level} cups (Scale of 1-10 cups of Extra-Charged Dark Roasts).

      Please analyze this and output a JSON response that is hilarious, parodies high-octane caffeine-fueled hustle culture, and looks high tech.
      Return a JSON object conforming exactly to this TypeScript schema:
      {
        "translatedText": "A hyper-caffeinated parody translation of their rant, written in ALL CAPS, packed with coffee metaphors (pumping glaze, double espresso energy, speedrunning spreadsheets, vibrating subatomic particles), and styled like an intense keyboard-warrior/tech startup manifesto. Do not make formatting errors.",
        "drinkRecommendation": "A funny, ridiculously custom named long-tail Dunkin' drink perfectly customized to their state.",
        "pulseSpeedHz": a numeric value representing their imaginary heart rate in beats-per-minute (make it comical e.g. 150 to 580 depending on the caffeine cup intake),
        "vibeMetrics": {
          "panicPct": a number (0 to 100) representing their panic level,
          "productivityPct": a number (100 to 500) representing their caffeinated speed productivity metric,
          "shakeFreq": a funny descriptive string describing their current hand-trembling speed stage (e.g. 'Stage 4 Vibrational levitation / double-tapping clicker')
        }
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() || "{}";
      const parsedData = JSON.parse(text);
      res.json(parsedData);
    } catch (err: any) {
      console.error("Gemini server translation error:", err);
      // Revert to stable humor response if parsing fails
      res.json({
        translatedText: `[API FREQUENCY SURGE RESCUE] THE INTENSITY WAS TOO HIGH FOR THE SYSTEM! CORE TRANSLATION: "${rant.toUpperCase()}"`,
        drinkRecommendation: "A Mug of Purified Espresso Syrup directly from the pump",
        pulseSpeedHz: 280,
        vibeMetrics: {
          panicPct: 99,
          productivityPct: 350,
          shakeFreq: "Severe Quantum Super-positional Shake"
        }
      });
    }
  });

  // Vite development middleware vs Static Production server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dunkin' Core Backend] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
