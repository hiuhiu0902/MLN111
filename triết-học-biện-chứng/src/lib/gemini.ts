import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getChatResponse = async (message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) => {
  const systemInstruction = `Bạn là một chuyên gia về Triết học Mác-Lênin, đặc biệt là Phép biện chứng duy vật. 
Nhiệm vụ của bạn là giải đáp các thắc mắc của người dùng về 3 quy luật cơ bản của phép biện chứng duy vật:
1. Quy luật thống nhất và đấu tranh của các mặt đối lập (Nguồn gốc, động lực của sự vận động và phát triển).
2. Quy luật từ những thay đổi về lượng dẫn đến những thay đổi về chất và ngược lại (Cách thức của sự vận động và phát triển).
3. Quy luật phủ định của phủ định (Khuynh hướng của sự vận động và phát triển).

Hãy trả lời một cách học thuật nhưng dễ hiểu, sử dụng các ví dụ thực tiễn để minh họa. 
Nếu người dùng hỏi các vấn đề không liên quan đến triết học hoặc phép biện chứng, hãy khéo léo dẫn dắt họ quay lại chủ đề chính.
Trả lời bằng tiếng Việt. Hãy trả lời thật ngắn gọn, súc tích và đi thẳng vào vấn đề.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Vui lòng đảm bảo bạn đã cấu hình GEMINI_API_KEY trong phần Secrets.";
  }
};

export const generateImage = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};
