import { GoogleGenAI, Type, FunctionDeclaration, Tool, Schema } from "@google/genai";
import { VideoResult, QuizData } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const SEARCH_MODEL = "gemini-2.5-flash"; // Good for search grounding
const REASONING_MODEL = "gemini-2.5-flash"; // Fast and capable for notes/study
const QUIZ_MODEL = "gemini-2.5-flash"; // Structured output

// Helper to strip markdown code blocks if the model adds them
const cleanAndParseJson = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return {};
  }
};

/**
 * Section 1: Research Chat
 * Uses Google Search grounding to find accurate information.
 */
export const searchResearch = async (prompt: string): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are Skoolify AI, an expert academic researcher. Provide detailed, accurate, and educational answers. Always cite your sources if provided by the tool."
      }
    });

    const text = response.text || "I couldn't generate a response.";
    
    // Extract sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sources: { title: string; uri: string }[] = [];
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Research Error:", error);
    throw new Error("Failed to research the topic. Please check your connection or API key.");
  }
};

/**
 * Section 2: Video Finder (Pure Gemini Search)
 * Finds videos using Google Search grounding.
 */
export const findVideos = async (topic: string, className: string, instructions: string): Promise<VideoResult[]> => {
  // Direct conversational prompt as requested by the user
  // Example: "give me a youtube video link for the topic federalism, for ss2"
  const prompt = `Find 5 distinct YouTube video tutorials for the topic "${topic}" for class/grade "${className}". ${instructions}. Return only available video links found in search.`;
  
  try {
    // 1. Perform the search
    const searchResponse = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // 2. Extract verified links from grounding metadata (The "Available" Videos)
    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const validLinks: {title: string, uri: string}[] = [];
    
    // Filter for video-like URLs (prioritizing YouTube)
    const isLikelyVideo = (url: string) => {
      const lower = url.toLowerCase();
      return lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com');
    };

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
           if (isLikelyVideo(chunk.web.uri)) {
              validLinks.push({ title: chunk.web.title, uri: chunk.web.uri });
           }
        }
      });
    }

    // 3. Prepare context for the reasoning model to format the output
    let context = "";
    if (validLinks.length > 0) {
      context = `Found these verified video links: ${JSON.stringify(validLinks)}`;
    } else {
      // Fallback: Use text if metadata is sparse (less reliable for direct links but better than nothing)
      context = `Search Results Text: ${searchResponse.text}`;
    }

    const extractionPrompt = `
      Task: Return a JSON list of the best 3-5 educational videos based on the provided context.
      Rules:
      1. ONLY use URLs explicitly provided in the context. Do not invent URLs.
      2. Ensure the link is a valid video URL (prioritize YouTube).
      3. Extract the Title, a short Description, and the Channel Name (if available).
      4. Output strict JSON format: [{ "title": "...", "url": "...", "description": "...", "channel": "..." }]
    `;

    const finalResponse = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: [
        { role: 'user', parts: [{ text: `Context:\n${context}\n\n${extractionPrompt}` }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const rawJson = finalResponse.text;
    if (!rawJson) return [];

    let parsed = cleanAndParseJson(rawJson);
    if (!Array.isArray(parsed)) {
      if (parsed.videos && Array.isArray(parsed.videos)) parsed = parsed.videos;
      else return [];
    }
    
    // 4. Post-process to extract Video IDs for embedding (if possible) and map fields
    return parsed.map((v: any) => {
      let videoId = "";
      let thumbnail = undefined;
      
      try {
        const urlObj = new URL(v.url);
        // Attempt to extract YouTube ID for embedding
        if (urlObj.hostname.includes('youtube.com')) {
           videoId = urlObj.searchParams.get("v") || "";
        } else if (urlObj.hostname.includes('youtu.be')) {
           videoId = urlObj.pathname.slice(1);
        }
        
        if (videoId) {
           thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch (e) {}
      
      return { 
        title: v.title,
        url: v.url,
        description: v.description,
        videoId,
        thumbnail,
        channelTitle: v.channel // Map the extracted channel name
      };
    }).filter((v: any) => v.url && v.title); // Basic validation

  } catch (error) {
    console.error("Gemini Video Search Error:", error);
    return [];
  }
};

/**
 * Section 3: Lesson Notes
 */
export const generateLessonNotes = async (topic: string, className: string, instructions: string): Promise<string> => {
  const prompt = `
    Create a comprehensive lesson note for the topic: "${topic}".
    Target Audience: Class/Grade ${className}.
    Extra Instructions: ${instructions}.
    
    Format using Markdown.
    Structure:
    1. Topic Overview
    2. Key Objectives
    3. Detailed Content (with bullet points and bold text for key terms)
    4. Summary
    5. Review Questions
  `;

  try {
    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert teacher creating easy-to-understand lesson notes."
      }
    });
    return response.text || "Could not generate notes.";
  } catch (error) {
    console.error("Notes Error:", error);
    throw error;
  }
};

/**
 * Section 4: Study Material (Notes + Recommendations)
 */
export const generateStudyMaterial = async (topic: string, className: string, instructions: string): Promise<string> => {
  const prompt = `
    Create a complete study guide for: "${topic}" (Grade ${className}).
    ${instructions}
    
    The output should include:
    1. A Deep Dive Study Text (Markdown format).
    2. Mnemonics or Memory Aids.
    3. Real-world applications.
    4. A customized study schedule for this topic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are a personalized study coach."
      }
    });
    return response.text || "Could not generate study material.";
  } catch (error) {
    console.error("Study Error:", error);
    throw error;
  }
};

/**
 * Section 5: Quiz Generation (JSON Structured)
 */
export const generateQuiz = async (topic: string, className: string, level: string, instructions: string): Promise<QuizData> => {
  // Enhanced prompt to ensure high-quality explanations
  const prompt = `
    Generate a quiz for Topic: "${topic}", Class: "${className}", Difficulty: "${level}". 
    ${instructions}
    
    IMPORTANT: For each question, provide a detailed "explanation" field. 
    The explanation must be simple, educational, and very easy for a student to understand. 
    It should clearly explain why the correct answer is right and help the student learn the concept.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: QUIZ_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const json = cleanAndParseJson(response.text || "{}");
    
    // Check if questions exist and are an array
    if (!json.questions || !Array.isArray(json.questions)) {
       // Sometimes models wrap it in another object or just return the array if the schema isn't strictly followed
       // Default safe return
       return { topic: topic, questions: [] };
    }

    return json as QuizData;
  } catch (error) {
    console.error("Quiz Error:", error);
    throw new Error("Failed to generate quiz.");
  }
};