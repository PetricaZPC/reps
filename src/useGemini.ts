const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export async function Gemini(userMessage: string) {
  try {
    console.log("Gemini API Key defined:", !!API_KEY);
    if (!API_KEY) {
      return "Error: API Key is missing. Check your .env file.";
    }

    console.log("Fetching from Gemini API...");

    // Create a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: userMessage,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
            },
          }),
        },
      );

      clearTimeout(timeoutId);
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Data received:", JSON.stringify(data).substring(0, 100));

      if (data.error) {
        return `Error: ${data.error.message}`;
      }

      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      return responseText;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return "Error: Request timed out (10s). Check your internet connection.";
      }
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gemini Fetch Error:", errorMessage);
    return `Error: ${errorMessage}`;
  }
}

export function extractCalories(responseText: string): {
  calories: number;
  protein: number;
  carbs: number;
  vitamins: string[];
  minerals: string[];
} {
  try {
    const textCuratat = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const jsonData = JSON.parse(textCuratat);

    let totalCalorii = 0;
    let totalProteine = 0;
    let totalCarbs = 0;
    const vitaminsSet = new Set<string>();
    const mineralsSet = new Set<string>();

    const pickArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        return value
          .split(/,|;/)
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return [];
    };

    const processItem = (item: any) => {
      totalCalorii += Number(item?.calorii ?? item?.calories) || 0;
      totalProteine += Number(item?.proteine ?? item?.protein) || 0;
      totalCarbs +=
        Number(item?.carbohidrati ?? item?.carbs ?? item?.carbohydrates) || 0;

      const vitamins = pickArray(item?.vitamine ?? item?.vitamins);
      const minerals = pickArray(item?.minerale ?? item?.minerals);

      vitamins.forEach((v) => vitaminsSet.add(v));
      minerals.forEach((m) => mineralsSet.add(m));
    };

    const normalizedItems = Array.isArray(jsonData)
      ? jsonData
      : Array.isArray(jsonData?.items)
        ? jsonData.items
        : Array.isArray(jsonData?.alimente)
          ? jsonData.alimente
          : null;

    if (normalizedItems) {
      for (const item of normalizedItems) {
        processItem(item);
      }
    } else if (jsonData && typeof jsonData === "object") {
      processItem(jsonData);
    }

    return {
      calories: totalCalorii || 0,
      protein: totalProteine || 0,
      carbs: totalCarbs || 0,
      vitamins: Array.from(vitaminsSet),
      minerals: Array.from(mineralsSet),
    };
  } catch {
    return { calories: 0, protein: 0, carbs: 0, vitamins: [], minerals: [] };
  }
}
