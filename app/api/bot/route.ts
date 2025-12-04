import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { serialize } from "next-mdx-remote/serialize"; // <--- MDX Serializer
import { searchProductsTool } from "@/utils/product-tool";

// Configure Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are the "Store Assistant". 
- You are helpful, polite, and concise.
- You have access to a tool called "search_products".
- If the tool returns results, summarize them nicely using Markdown tables or lists.
`;

const toolFunctions: Record<string, Function> = {
  search_products: searchProductsTool,
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description: "Search for products.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            category: { type: Type.STRING },
            minPrice: { type: Type.NUMBER },
            maxPrice: { type: Type.NUMBER },
            sort: { type: Type.STRING },
          },
        },
      },
    ],
  },
];

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    // 1. Prepare history for Gemini
    let contents = (history || []).map((msg: any) => ({
      role: msg.role,
      parts: msg.parts
    }));

    contents.push({ role: "user", parts: [{ text: message }] });

    let finalResponseText = "";

    // 2. Loop for Tool Execution
    while (true) {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: { tools, systemInstruction: SYSTEM_PROMPT },
      });

      if (result.functionCalls && result.functionCalls.length > 0) {
        const functionCall = result.functionCalls[0];
        const { name, args } = functionCall;

        if (!name || !toolFunctions[name]) throw new Error(`Unknown tool: ${name}`);

        console.log(`Executing tool: ${name}`);
        const toolResult = await toolFunctions[name](args);

        const functionResponsePart = {
          name: name,
          response: { result: toolResult },
        };

        contents.push({ role: "model", parts: [{ functionCall }] });
        contents.push({ role: "user", parts: [{ functionResponse: functionResponsePart }] });
      } else {
        // We have the final text
        finalResponseText = result.text || "";
        break;
      }
    }

    // 3. SERIALIZE MDX (Server Side)
    // This compiles the markdown string into a format next-mdx-remote can render
    const mdxSource = await serialize(finalResponseText);

    return NextResponse.json({ 
      role: "model", 
      content: finalResponseText, // Raw text (for history array)
      mdxSource: mdxSource        // Compiled MDX (for display)
    });

  } catch (error: any) {
    console.error("Bot Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}