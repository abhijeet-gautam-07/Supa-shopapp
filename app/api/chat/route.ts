import { GoogleGenAI } from "@google/genai";


const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;

console.log(GEMINI_API_KEY);

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

async function main() {
    const response  = await ai.models.generateContent(
        {
            model: "gemini-2.5-flash",
            contents: "generate about today's weather",
        }
    );
    console.log(response.text);
}


main();
