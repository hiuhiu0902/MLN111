import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

export const getChatResponse = async (
  message: string,
  history: ChatHistoryItem[]
) => {
  if (!ai) {
    return "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env.local nên chatbot AI chưa hoạt động.";
  }

  const systemInstruction = `Bạn là một chuyên gia về Triết học Mác-Lênin, đặc biệt là Phép biện chứng duy vật.
Nhiệm vụ của bạn là giải đáp các thắc mắc của người dùng về 3 quy luật cơ bản của phép biện chứng duy vật:
1. Quy luật thống nhất và đấu tranh của các mặt đối lập.
2. Quy luật từ những thay đổi về lượng dẫn đến những thay đổi về chất và ngược lại.
3. Quy luật phủ định của phủ định.

Hãy trả lời một cách học thuật nhưng dễ hiểu, có ví dụ thực tiễn ngắn gọn.
Nếu người dùng hỏi ngoài chủ đề, hãy khéo léo dẫn lại về triết học.
Trả lời bằng tiếng Việt, ngắn gọn, súc tích, đi thẳng vào vấn đề.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Tôi chưa tạo được phản hồi từ Gemini. Hãy thử lại.";
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);

    const rawMessage =
      error?.message ||
      error?.statusText ||
      "Đã có lỗi xảy ra khi kết nối Gemini.";

    if (
      rawMessage.includes("503") ||
      rawMessage.includes("UNAVAILABLE") ||
      rawMessage.toLowerCase().includes("high demand")
    ) {
      return "Hệ thống AI đang quá tải tạm thời. Bạn thử lại sau vài giây.";
    }

    if (
      rawMessage.toLowerCase().includes("api key") ||
      rawMessage.toLowerCase().includes("permission") ||
      rawMessage.toLowerCase().includes("unauthorized")
    ) {
      return "Gemini API key không hợp lệ hoặc chưa được cấp quyền cho model này.";
    }

    return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
  }
};

export const generateImage = async (prompt: string) => {
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