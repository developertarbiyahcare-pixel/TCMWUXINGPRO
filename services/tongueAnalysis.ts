
// Fix: Update model to gemini-3-flash-preview for better image analysis and compliance with latest guidelines.

import { GoogleGenAI } from "@google/genai";
import { ApiKeyEntry } from '../types';

export async function analyzeTongueImage(base64Image: string, apiKeys?: ApiKeyEntry[]): Promise<{ text: string, exhaustedKeys: string[] }> {
  const availableKeys = (apiKeys || []).filter(k => !k.isExhausted && k.key.trim() !== "");
  const exhaustedIndices: number[] = [];
  
  if (availableKeys.length === 0) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      availableKeys.push({ key: envKey, isExhausted: false });
    }
  }

  if (availableKeys.length === 0) throw new Error("No active Gemini API keys found.");

  const [mimeTypePrefix, base64Data] = base64Image.split(';base64,');
  const mimeType = mimeTypePrefix ? mimeTypePrefix.split(':')[1] : "image/jpeg";

  const prompt = `
  Kamu adalah ahli diagnosis lidah TCM (Traditional Chinese Medicine) tingkat profesor.
  Analisis foto lidah ini dengan sangat detail dan akurat.
  Jawab dalam Bahasa Indonesia, format:

  1. Warna badan lidah: ...
  2. Warna lapisan/sabur: ...
  3. Kualitas sabur: ...
  4. Fitur khusus: (crack, teeth marks, red points, deviated, swollen, thin, dll)
  5. Kesimpulan pola utama: (contoh: Kidney Yin Deficiency with Empty Heat, Spleen Qi Deficiency with Dampness, Liver Fire, dll)
  6. Rekomendasi titik akupuntur tambahan (3-5 titik): ...

  Hanya jawab berdasarkan foto lidah ini, jangan tambah-tambah.
  `;

  let lastError: any = null;
  const maxRetries = Math.min(availableKeys.length, 3);

  for (let i = 0; i < maxRetries; i++) {
    const apiKey = availableKeys[i].key;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      });

      return {
        text: response.text || "Maaf, tidak dapat menganalisis gambar ini.",
        exhaustedKeys: exhaustedIndices.map(idx => availableKeys[idx].key)
      };
    } catch (error: any) {
      console.error(`Tongue Analysis Error with key ${apiKey.substring(0, 8)}...:`, error);
      lastError = error;
      if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("403")) {
        exhaustedIndices.push(i);
        continue;
      } else {
        throw error;
      }
    }
  }

  throw lastError || new Error("Gagal melakukan analisis lidah.");
}
