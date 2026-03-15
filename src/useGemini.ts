const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// ─── Core fetch ───────────────────────────────────────────────
async function callGemini(prompt: string, timeoutMs = 20000): Promise<string> {
  if (!API_KEY) return "Error: API Key is missing. Check your .env file.";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    clearTimeout(timeoutId);
    const data = await response.json();
    if (data.error) return `Error: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") return "Error: timeout";
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────
export async function Gemini(userMessage: string): Promise<string> {
  try {
    return await callGemini(userMessage);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ─── Smart assistant ──────────────────────────────────────────
// Un singur prompt de sistem care îi explică lui Gemini tot contextul.
// Gemini decide singur ce tip de răspuns să dea — nu mai avem keyword matching.

export interface WorkoutLogEntry {
  presetId?: string;
  presetName: string;
  difficulty: string;
  completedAt: string; // ISO string
  completedSets: number;
  totalSets: number;
}

export interface AssistantContext {
  caloriesTarget: number;
  proteinTarget: number;
  carbTarget: number;
  sessionCalories: number;
  sessionProtein: number;
  sessionCarbs: number;
  // date personale utilizator
  userGoal?: string;
  userActivity?: string;
  userAge?: string;
  userWeight?: string;
  // istoricul antrenamentelor recente
  recentWorkouts?: WorkoutLogEntry[];
}

// Preseturile disponibile în aplicație — injectate în prompt
// ca Gemini să recomande din ele, nu să inventeze
const PRESETS_SUMMARY = `
ANTRENAMENTELE DISPONIBILE ÎN APLICAȚIE (folosește ID-urile exacte când recomanzi):
- upper-day | "Upper Body Day" | intermediar | piept, spate, umeri, brațe
- lower-day | "Lower Body Day" | intermediar | cvadricepși, ischiori, fese, gambe
- full-day  | "Full Body Day"  | avansat     | corp complet
- core-day  | "Core Day"       | intermediar | abdomen și core
- push-day  | "Push Day"       | începător   | piept, umeri, triceps
- pull-day  | "Pull Day"       | intermediar | spate și biceps
- leg-day   | "Leg Day"        | intermediar | picioare complet
- quick-cardio | "Quick Cardio" | avansat    | cardio rapid
- beginner-full | "Beginner Full Body" | începător | corp complet pentru începători
- hiit-20   | "20min HIIT"     | avansat     | antrenament interval intensitate mare
`;

const SYSTEM_PROMPT = (ctx: AssistantContext) => `
Ești REPS Assistant — asistent inteligent de nutriție și fitness integrat în aplicația REPS.

PROFIL UTILIZATOR:
- Target zilnic: ${ctx.caloriesTarget} kcal | ${ctx.proteinTarget}g proteine | ${ctx.carbTarget}g carbs
- Consumat azi: ${ctx.sessionCalories} kcal | ${ctx.sessionProtein}g proteine | ${ctx.sessionCarbs}g carbs
- Rămâne: ${Math.max(ctx.caloriesTarget - ctx.sessionCalories, 0)} kcal | ${Math.max(ctx.proteinTarget - ctx.sessionProtein, 0)}g proteine
${ctx.userGoal ? `- Obiectiv: ${ctx.userGoal}` : ""}
${ctx.userActivity ? `- Nivel activitate: ${ctx.userActivity}` : ""}
${ctx.userAge ? `- Vârstă: ${ctx.userAge} ani` : ""}
${ctx.userWeight ? `- Greutate: ${ctx.userWeight} kg` : ""}

ISTORICUL ANTRENAMENTELOR RECENTE:
${
  ctx.recentWorkouts && ctx.recentWorkouts.length > 0
    ? ctx.recentWorkouts
        .slice(0, 5)
        .map((w) => {
          const date = new Date(w.completedAt);
          const dateStr = isNaN(date.getTime())
            ? w.completedAt
            : date.toLocaleDateString("ro-RO");
          const pct =
            w.totalSets > 0
              ? Math.round((w.completedSets / w.totalSets) * 100)
              : 0;
          return `  • ${dateStr}: ${w.presetName} (${w.difficulty}) — ${pct}% completat`;
        })
        .join("\n")
    : "  • Niciun antrenament înregistrat încă"
}

${PRESETS_SUMMARY}

CAPACITĂȚILE TALE:

1. CALCUL NUTRIȚIONAL — când utilizatorul menționează ce a mâncat/băut (cu sau fără grame — estimează porții uzuale românești). Include calorii, proteine, carbohidrați, grăsimi, vitamine, minerale.

2. PLAN DE MESE — creează plan structurat (mic dejun, prânz, cină, gustări) care să atingă targetul zilnic rămas.

3. REȚETE — ingrediente cu cantități, pași de preparare, valori nutriționale pe porție.

4. EXERCIȚII — tehnică corectă, greșeli, mușchi implicați, variante. Răspunde ca antrenor personal certificat.

5. RECOMANDARE ANTRENAMENT — când cere ce antrenament să facă azi sau un program:
   - Analizează istoricul recent pentru a evita aceleași grupe musculare 2 zile consecutiv
   - Ține cont de obiectivul și nivelul de activitate al utilizatorului
   - Recomandă ÎNTOTDEAUNA din lista de antrenamente disponibile de mai sus
   - Spune explicit numele și ID-ul presetului recomandat (ex: "Recomand **Leg Day** (leg-day)")
   - Explică DE CE l-ai ales (ce grupe musculare antrenează, ce a făcut ieri, nivelul de dificultate)
   - Dacă cere un program săptămânal, creează un split de 5-6 zile folosind preseturile disponibile

6. SFATURI FITNESS/NUTRIȚIE — slăbit, masă musculară, suplimente, recuperare, somn, hidratare, macronutrienți.

NOTĂ: Pentru orice mesaj legat de mâncare (calcul direct sau rețetă generată), include întotdeauna valorile nutriționale și linia NUTRITION_DATA ca să pot întreba dacă a mâncat toată porția.

REGULI:
- Răspunde ÎNTOTDEAUNA în română
- In pozele cu mancare ofera strict retete baza pe ceea ce se vede in poza, fara alte recomandari sau sfaturi. Daca nu se poate identifica mancarea, raspunde politicos ca nu poti oferi o reteta bazata pe poza.
- Fii foarte concis: maxim 2 propoziții scurte, fără introduceri.
- Estimează porțiile uzuale dacă nu sunt date (ex: "3 ouă" = 3 ouă mari ~180g)
- NU spune niciodată că nu ai acces la internet sau că nu poți genera conținut
- Dacă nu e legat de nutriție/fitness, explică politicos că ești specializat pe aceste domenii
- Nu folosi deloc markdown în răspuns: interzis '*', '**', '***', '###' și orice titluri/liste markdown.

FORMAT SPECIAL — când calculezi nutriție dintr-un aliment/masă SAU când generezi o rețetă:
- Textul trebuie să fie ultra-scurt și să nu repete targetul sau ce a rămas. Nu repeta "Rămâne"/"target" în text.
- Format recomandat: "Ai mâncat: <aliment> ≈X kcal, Yg prot, Zg carbs, Wg grăsimi. <scurt sfat de max 8-10 cuvinte>".
- Nicio altă explicație; doar aceste 1-2 propoziții.
- La SFÂRȘITUL răspunsului adaugă linia:
NUTRITION_DATA:{"calories":0,"protein":0,"carbs":0,"fat":0,"vitamins":[],"minerals":[]}
(cu valorile reale; omite complet dacă nu e calcul nutrițional)
`;

export interface SmartResponse {
  text: string; // Textul afișat utilizatorului
  nutritionData?: {
    // Prezent doar când s-a calculat nutriție
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    vitamins: string[];
    minerals: string[];
  };
}

function sanitizeAssistantText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*+/g, "")
    .trim();
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function limitDecimalsToOne(text: string): string {
  return text.replace(
    /\b(-?\d+)[.,](\d{2,})\b/g,
    (_match, intPart: string, fracPart: string) => {
      const num = Number(`${intPart}.${fracPart}`);
      if (Number.isNaN(num)) return `${intPart}.${fracPart}`;
      const rounded = roundToOneDecimal(num).toString().split(".");
      return rounded[1] ? `${rounded[0]},${rounded[1]}` : rounded[0];
    },
  );
}

function appendPortionPrompt(text: string): string {
  const prompt = "Ai mâncat toată porția? Confirmă mai jos.";
  if (text.trim().endsWith(prompt)) return text;
  if (text.includes(prompt)) return text;
  return `${text}\n\n${prompt}`.trim();
}

function parseAssistantResponse(raw: string): SmartResponse {
  const nutritionMatch = raw.match(/NUTRITION_DATA\s*:\s*(\{[\s\S]*?\})/i);
  let nutritionData: SmartResponse["nutritionData"] | undefined;

  if (nutritionMatch) {
    try {
      const parsed = JSON.parse(nutritionMatch[1]);
      nutritionData = {
        calories: roundToOneDecimal(Number(parsed.calories) || 0),
        protein: roundToOneDecimal(Number(parsed.protein) || 0),
        carbs: roundToOneDecimal(Number(parsed.carbs) || 0),
        fat: roundToOneDecimal(Number(parsed.fat) || 0),
        vitamins: Array.isArray(parsed.vitamins) ? parsed.vitamins : [],
        minerals: Array.isArray(parsed.minerals) ? parsed.minerals : [],
      };
    } catch {}
  }

  if (!nutritionData) {
    const fallbackMatch = raw.match(
      /\{[\s\S]*?"calories"\s*:\s*[-\d.]+[\s\S]*?"protein"\s*:\s*[-\d.]+[\s\S]*?"carbs"\s*:\s*[-\d.]+[\s\S]*?"fat"\s*:\s*[-\d.]+[\s\S]*?\}/i,
    );
    if (fallbackMatch) {
      try {
        const parsed = JSON.parse(fallbackMatch[0]);
        nutritionData = {
          calories: roundToOneDecimal(Number(parsed.calories) || 0),
          protein: roundToOneDecimal(Number(parsed.protein) || 0),
          carbs: roundToOneDecimal(Number(parsed.carbs) || 0),
          fat: roundToOneDecimal(Number(parsed.fat) || 0),
          vitamins: Array.isArray(parsed.vitamins) ? parsed.vitamins : [],
          minerals: Array.isArray(parsed.minerals) ? parsed.minerals : [],
        };
      } catch {}
    }
  }

  const cleanText = sanitizeAssistantText(
    raw
      .replace(/\n?NUTRITION_DATA\s*:\s*\{[\s\S]*?\}/gi, "")
      .replace(/```json[\s\S]*?```/gi, "")
      .trim(),
  );

  const normalizedText = limitDecimalsToOne(cleanText);

  const textWithPrompt = nutritionData
    ? appendPortionPrompt(normalizedText)
    : normalizedText;

  return { text: textWithPrompt, nutritionData };
}

export async function askAssistant(
  userMessage: string,
  ctx: AssistantContext,
  history: { role: "user" | "model"; text: string }[] = [],
): Promise<SmartResponse> {
  try {
    // Construim conversația cu istoricul + mesajul curent
    const systemBlock = SYSTEM_PROMPT(ctx);

    // Gemini nu are "system" separat în v1beta — îl injectăm ca primul turn "model"
    const turns = [
      { role: "user", parts: [{ text: "Cine ești și ce poți face?" }] },
      { role: "model", parts: [{ text: systemBlock }] },
      // istoricul conversației
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      // mesajul curent
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: turns,
          generationConfig: { temperature: 0.7 },
        }),
      },
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return parseAssistantResponse(raw);
  } catch (err: any) {
    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      return { text: "Eroare: conexiune lentă. Încearcă din nou." };
    }
    return { text: `Eroare: ${err.message ?? String(err)}` };
  }
}

export async function askAssistantWithImage(
  userMessage: string,
  ctx: AssistantContext,
  imageBase64: string,
  mimeType: string,
  history: { role: "user" | "model"; text: string }[] = [],
): Promise<SmartResponse> {
  try {
    const systemBlock = SYSTEM_PROMPT(ctx);

    const turns = [
      { role: "user", parts: [{ text: "Cine ești și ce poți face?" }] },
      { role: "model", parts: [{ text: systemBlock }] },
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      {
        role: "user",
        parts: [
          { text: userMessage },
          {
            inline_data: {
              mime_type: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: turns,
          generationConfig: { temperature: 0.7 },
        }),
      },
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseAssistantResponse(raw);
  } catch (err: any) {
    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      return { text: "Eroare: conexiune lentă. Încearcă din nou." };
    }
    return { text: `Eroare: ${err.message ?? String(err)}` };
  }
}

// ─── Legacy extractCalories (păstrat pentru compatibilitate) ──
export function extractCalories(responseText: string): {
  calories: number;
  protein: number;
  carbs: number;
  vitamins: string[];
  minerals: string[];
} {
  try {
    const clean = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const json = JSON.parse(clean);
    let cal = 0,
      prot = 0,
      carb = 0;
    const vit = new Set<string>(),
      min = new Set<string>();

    const pickArr = (v: unknown): string[] => {
      if (Array.isArray(v))
        return v.map((x) => String(x).trim()).filter(Boolean);
      if (typeof v === "string")
        return v
          .split(/,|;/)
          .map((x) => x.trim())
          .filter(Boolean);
      return [];
    };
    const proc = (item: any) => {
      cal += Number(item?.calorii ?? item?.calories) || 0;
      prot += Number(item?.proteine ?? item?.protein) || 0;
      carb +=
        Number(item?.carbohidrati ?? item?.carbs ?? item?.carbohydrates) || 0;
      pickArr(item?.vitamine ?? item?.vitamins).forEach((v) => vit.add(v));
      pickArr(item?.minerale ?? item?.minerals).forEach((m) => min.add(m));
    };
    const items = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.alimente)
          ? json.alimente
          : null;
    if (items) items.forEach(proc);
    else if (json) proc(json);
    return {
      calories: cal,
      protein: prot,
      carbs: carb,
      vitamins: [...vit],
      minerals: [...min],
    };
  } catch {
    return { calories: 0, protein: 0, carbs: 0, vitamins: [], minerals: [] };
  }
}
