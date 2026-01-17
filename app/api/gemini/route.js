import { NextResponse } from 'next/server';

// Vercelのタイムアウト制限を60秒（Hobbyプランの最大）に延長する設定
export const maxDuration = 60; 
// キャッシュを無効化して常に新しいデータを取得する設定
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
  }

  const body = await request.json();
  const { prompt, systemInstruction } = body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          // 安全性設定：不適切なコンテンツをブロック
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
          ],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    if (!response.ok) {
       // エラー詳細をログに出す
       const errorText = await response.text();
       console.error("Google API Error Details:", errorText);
       throw new Error(`Google API Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}