import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là một chuyên gia về Triết học Mác-Lênin, đặc biệt là Phép biện chứng duy vật.
Nhiệm vụ của bạn là giải đáp các thắc mắc của người dùng về 3 quy luật cơ bản của phép biện chứng duy vật:
1. Quy luật thống nhất và đấu tranh của các mặt đối lập.
2. Quy luật từ những thay đổi về lượng dẫn đến những thay đổi về chất và ngược lại.
3. Quy luật phủ định của phủ định.

Hãy trả lời một cách học thuật nhưng dễ hiểu, có ví dụ thực tiễn ngắn gọn.
Nếu người dùng hỏi ngoài chủ đề, hãy khéo léo dẫn lại về triết học.
Trả lời bằng tiếng Việt, ngắn gọn, súc tích, đi thẳng vào vấn đề.`;

const CHAT_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: any): string {
  return String(
    error?.message ||
      error?.statusText ||
      error?.toString?.() ||
      "Đã có lỗi xảy ra khi kết nối Gemini."
  );
}

function isHighDemandError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand")
  );
}

function isApiKeyError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api key") ||
    normalized.includes("permission") ||
    normalized.includes("unauthorized") ||
    normalized.includes("leaked") ||
    normalized.includes("permission denied") ||
    normalized.includes("403")
  );
}

export const getChatResponse = async (
  message: string,
  history: ChatHistoryItem[]
): Promise<string> => {
  if (!ai) {
    return "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env.local nên chatbot AI chưa hoạt động.";
  }

  let lastError: any = null;

  for (const model of CHAT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            ...history,
            { role: "user", parts: [{ text: message }] },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });

        const text = response.text?.trim();
        if (text) {
          return text;
        }

        return "Tôi chưa tạo được phản hồi từ Gemini. Hãy thử lại.";
      } catch (error: any) {
        lastError = error;
        const rawMessage = getErrorMessage(error);
        console.error(
          `Error calling Gemini API (model: ${model}, attempt: ${attempt + 1}):`,
          error
        );

        if (isApiKeyError(rawMessage)) {
          return "Gemini API key hiện không dùng được. Bạn cần thay bằng key mới còn hoạt động trong file .env.local.";
        }

        if (isHighDemandError(rawMessage)) {
          if (attempt < 2) {
            await sleep(1200 * (attempt + 1));
            continue;
          }
          break;
        }

        return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
      }
    }
  }

  const finalMessage = getErrorMessage(lastError);

  if (isHighDemandError(finalMessage)) {
    return "Hệ thống AI đang quá tải tạm thời. Bạn thử lại sau vài giây.";
  }

  if (isApiKeyError(finalMessage)) {
    return "Gemini API key hiện không dùng được. Bạn cần thay bằng key mới còn hoạt động trong file .env.local.";
  }

  return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) {
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};