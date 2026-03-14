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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      'Esti un expert in nutritie. Analizeaza ce a mancat utilizatorul si returneaza DOAR un JSON valid cu: nume_aliment, calorii, proteine.\n\nUtilizator a mancat: ' +
                      userMessage,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
            },
          }),
        }
      );

      clearTimeout(timeoutId);
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Data received:", JSON.stringify(data).substring(0, 100));

      if (data.error) {
        return `Error: ${data.error.message}`;
      }

      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      return responseText;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
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

export function extractCalories(responseText: string): number {
  try {
    const textCuratat = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonData = JSON.parse(textCuratat);

    let totalCalorii = 0;
    if (Array.isArray(jsonData)) {
      for (const item of jsonData) {
        totalCalorii += Number(item.calorii) || 0;
      }
    } else {
      totalCalorii = Number(jsonData.calorii) || 0;
    }
    return totalCalorii || 0;
  } catch {
    return 0;
  }
}