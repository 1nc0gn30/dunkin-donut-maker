import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { rant, caffeineLevel } = JSON.parse(event.body || '{}');
    if (!rant?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Scream box is empty! Produce some noise first.' }) };
    }

    const level = Number(caffeineLevel) || 1;

    if (!apiKey) {
      const fallbackQuotes = [
        'MY COMPUTER MOUSE IS MOVING AT RETINA SPEED. I AM EXCEL SHEET CHAMPION! THE CORE GLAZE ENGINE LIVES WITHIN ME!!!',
        'PUMP THOSE SPRINKLES!!! THREE MORE MINUTES TILL MEETING OUTBURST!!! HEARTRATE OVER 300!!!',
        'NO SLEEP! NOT UNTIL EXCEL FORMULAS ACHIEVE ABSOLUTE GLORIOUS PURITY! THE ICED COFFEE SEEDS IN MY BLOOD SYSTEM WILL NEVER DIE!!!',
        'I AM IN TUNE WITH THE GLUE DEPARTMENTS. WE MUST SYNCHRONIZE COFFEE DRINKERS WITH COFFEE ROASTERS IMMEDIATELY.',
      ];
      const randomText = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      return {
        statusCode: 200,
        body: JSON.stringify({
          translatedText: `[AUTO-ENERGY EMULATOR] ${randomText} YOUR CORE RANT: "${rant.toUpperCase()}"`,
          drinkRecommendation: 'Extra-Charged Double-Stretched Turbo Espresso with 4 Pumps of Chocolate Whipped Glaze',
          pulseSpeedHz: 120 + level * 45,
          vibeMetrics: {
            panicPct: Math.min(100, 25 + level * 15),
            productivityPct: 100 + level * 60,
            shakeFreq: `Vibe-Shift Stage ${level} Tremor (${level * 12}Hz Keyboard Wobble)`,
          },
        }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

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
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text?.trim() || '{}';
    const parsedData = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsedData),
    };
  } catch (err: any) {
    console.error('Gemini error:', err);
    const level = 1;
    return {
      statusCode: 200,
      body: JSON.stringify({
        translatedText: `[API FREQUENCY SURGE RESCUE] THE INTENSITY WAS TOO HIGH FOR THE SYSTEM! CORE TRANSLATION: "${(err?.rant || '').toUpperCase()}"`,
        drinkRecommendation: 'A Mug of Purified Espresso Syrup directly from the pump',
        pulseSpeedHz: 280,
        vibeMetrics: {
          panicPct: 99,
          productivityPct: 350,
          shakeFreq: 'Severe Quantum Super-positional Shake',
        },
      }),
    };
  }
};
