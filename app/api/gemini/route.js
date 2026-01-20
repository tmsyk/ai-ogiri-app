import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// ★ここが重要：Vercelの関数実行時間を延ばす設定
// Hobby(無料): 最大60秒まで設定可能（デフォルトは10秒）
// Pro(有料): 最大300秒まで設定可能
export const maxDuration = 60; 

// キャッシュを無効化（常に新しい回答を得るため）
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { prompt, systemInstruction } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 高速なFlashモデルを使用
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-preview-09-2025",
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ 
      candidates: [{ content: { parts: [{ text }] } }] 
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Gemini", details: error.message },
      { status: 500 }
    );
  }
}