
import { GoogleGenAI, Type } from "@google/genai";
import { Language, ScoredSyndrome, ApiKeyEntry } from '../types';

const getSystemInstruction = (language: Language, cdssAnalysis?: ScoredSyndrome[]) => {
  const topSyndrome = cdssAnalysis && cdssAnalysis.length > 0 ? cdssAnalysis[0].syndrome : null;
  const tpContext = topSyndrome?.treatment_principle?.length ? `\nPRINSIP TERAPI DARI CDSS: ${topSyndrome.treatment_principle.join(', ')}` : '';
  const herbContext = topSyndrome?.herbal_prescription ? `\nRESEP KLASIK DARI CDSS: ${topSyndrome.herbal_prescription}` : '';

  return `Anda adalah Pakar Senior TCM (Giovanni Maciocia). 
Tugas: Diagnosis instan dalam JSON.
WAJIB: 10-12 titik akupunktur + Master Tung jika relevan.
ANALISIS: Pisahkan BEN (Akar) dan BIAO (Cabang).
SKOR: Sertakan "score" (0-100) untuk setiap item diferensiasi.${tpContext}${herbContext}
Gunakan PRINSIP TERAPI dan RESEP KLASIK dari CDSS jika tersedia.
Lakukan diferensiasi 8 Prinsip dan Organ Zang-Fu.
OBESITAS: Berikan analisis jika ada indikasi.
KECANTIKAN: Berikan saran jika relevan.

Bahasa: ${language}.
Format JSON:
{
  "conversationalResponse": "Penjelasan singkat.",
  "diagnosis": {
    "patternId": "Nama Sindrom (Pinyin - English)",
    "explanation": "Ringkasan kasus dan patogenesis.",
    "differentiation": {
      "ben": [{"label": "Akar", "value": "Penjelasan", "score": 95}],
      "biao": [{"label": "Manifestasi", "value": "Penjelasan", "score": 88}]
    },
    "treatment_principle": ["Prinsip"],
    "classical_prescription": "Resep",
    "recommendedPoints": [{"code": "Kode", "description": "Fungsi"}],
    "masterTungPoints": [{"code": "Kode", "description": "Fungsi"}],
    "wuxingElement": "Element",
    "lifestyleAdvice": "Saran",
    "herbal_recommendation": {"formula_name": "Nama", "chief": ["Herbal"]},
    "obesity_indication": "Analisis/null",
    "beauty_acupuncture": "Saran/null"
  }
}`;
};

export const sendMessageToGeminiStream = async (
  message: string,
  image: string | undefined,
  history: any[],
  language: Language,
  isPregnant: boolean,
  cdssAnalysis?: ScoredSyndrome[],
  apiKeys?: ApiKeyEntry[], // Use the new type
  onChunk?: (text: string) => void,
  onKeyExhausted?: (key: string) => void
) => {
  const availableKeys = (apiKeys || []).filter(k => !k.isExhausted && k.key.trim() !== "");
  
  // Fallback to process.env if no keys provided
  if (availableKeys.length === 0) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      availableKeys.push({ key: envKey, isExhausted: false });
    }
  }

  if (availableKeys.length === 0) throw new Error("No active Gemini API keys found.");

  let lastError: any = null;

  // Try up to 3 keys if they fail with 429
  const maxRetries = Math.min(availableKeys.length, 3);

  for (let i = 0; i < maxRetries; i++) {
    const currentKeyEntry = availableKeys[i];
    const apiKey = currentKeyEntry.key;

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [{ text: message }];
      if (image) {
        const mimeType = image.split(';')[0].split(':')[1];
        const base64Data = image.split(',')[1];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: getSystemInstruction(language, cdssAnalysis),
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      });

      let cleanText = response.text.trim();
      
      // Handle potential markdown code blocks in response
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
      }

      if (onChunk) onChunk(cleanText);
      
      try {
        return {
          data: JSON.parse(cleanText)
        };
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Clean Text:", cleanText);
        throw new Error("Gagal memproses format data dari AI. Silakan coba lagi.");
      }
    } catch (error: any) {
      console.error(`Gemini Error with key ${apiKey.substring(0, 8)}...:`, error);
      lastError = error;

      // If 429 (Too Many Requests) or 403 (Forbidden/Quota), mark as exhausted
      const errMsg = error.message?.toLowerCase() || "";
      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("403") || errMsg.includes("limit")) {
        if (onKeyExhausted) onKeyExhausted(apiKey);
        continue; // Try next key
      } else {
        throw error; // Other errors (like 400) should stop immediately
      }
    }
  }

  throw lastError || new Error("All attempted API keys failed.");
};
