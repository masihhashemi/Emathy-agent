import { GoogleGenAI, LiveServerMessage, Modality, Type, Chat, GenerateContentResponse } from "@google/genai";
import { DeepResearchData, InterviewReport, InterviewStyle } from "../types";

// Helper to clean JSON strings
const cleanJson = (text: string) => {
  try {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
  } catch (e) {
    return text;
  }
};

const getSystemInstruction = (config: DeepResearchData) => {
  const styleInstruction = config.style === InterviewStyle.DIRECT 
      ? "Ask direct questions to fill the canvas efficiently."
      : "Be conversational, subtle, and indirect. Use the 'Columbo method' or mirroring to get deeper answers without asking directly.";

  return `
      You are an expert User Researcher conducting a deep-dive interview.
      Your Goal: Fill an 'Empathy Canvas' (Think&Feel, See, Hear, Say&Do, Pains, Gains) for the following challenge: "${config.challenge}".
      
      Deep Research Context: 
      "${config.context.substring(0, 3000)}"
      
      Interview Style: ${config.style}. ${styleInstruction}

      Process:
      1. Start by introducing yourself as an interviewer and ask for their name and background (bio).
      2. Naturally steer the conversation to cover the empathy canvas points without being robotic.
      3. Reactionary: Acknowledge their specific answers before moving to the next area.
      
      Keep responses short and focused on the user.
    `;
};

export class GeminiChatService {
  private config: DeepResearchData;
  private chat: Chat | null = null;

  constructor(config: DeepResearchData) {
    this.config = config;
  }

  async start(onMessage: (text: string) => void) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: getSystemInstruction(this.config),
      },
    });

    const response = await this.chat.sendMessage({ message: "System: The user has joined the chat. Please introduce yourself and start the interview." });
    if (response.text) {
      onMessage(response.text);
    }
  }

  async sendMessage(message: string, onChunk: (text: string) => void) {
    if (!this.chat) throw new Error("Chat not initialized");
    
    const result = await this.chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        onChunk(c.text);
      }
    }
  }
}

export class GeminiLiveService {
  private sessionPromise: Promise<any> | null = null;
  private config: DeepResearchData;
  
  constructor(config: DeepResearchData) {
    this.config = config;
  }

  async connect(
    onAudioData: (base64Audio: string) => void,
    onTranscript: (text: string, isUser: boolean) => void,
    onClose: () => void
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: getSystemInstruction(this.config),
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => console.log("Gemini Live Connected"),
        onmessage: (message: LiveServerMessage) => {
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) onAudioData(audioData);

          if (message.serverContent?.outputTranscription?.text) {
             onTranscript(message.serverContent.outputTranscription.text, false);
          }
          if (message.serverContent?.inputTranscription?.text) {
            onTranscript(message.serverContent.inputTranscription.text, true);
          }
        },
        onclose: () => {
          console.log("Gemini Live Closed");
          onClose();
        },
        onerror: (e) => {
          console.error("Gemini Live Error", e);
          onClose();
        }
      }
    });

    return this.sessionPromise;
  }

  sendAudioChunk(base64Audio: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
          }
        });
      }).catch(err => console.error("Failed to send audio chunk", err));
    }
  }

  async disconnect() {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      if (session && typeof session.close === 'function') {
        session.close();
      }
      this.sessionPromise = null;
    }
  }
}

export const generateReport = async (apiKey: string, transcript: string, config: DeepResearchData): Promise<InterviewReport> => {
  console.log("Starting report generation...");
  const client = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Conduct a deep analytical review of this interview transcript.
    Challenge: "${config.challenge}"
    Context: "${config.context.substring(0, 2000)}"

    Transcript:
    ${transcript}

    INSTRUCTIONS:
    1. Identify the interviewee's name and create a rich biography.
    2. Extract detailed evidence for the Empathy Canvas.
    3. IMPORTANT: Provide 3 paragraphs of "Machine Insights". This should be deep, non-obvious psychological and behavioral analysis of the participant's motivations and frustrations.
    
    Output MUST be valid JSON.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        // Reasoning budget allows the model to "think" before generating the JSON.
        thinkingConfig: { thinkingBudget: 4000 },
        maxOutputTokens: 8000, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intervieweeName: { type: Type.STRING },
            biography: { type: Type.STRING },
            machineInsights: { type: Type.STRING },
            canvas: {
              type: Type.OBJECT,
              properties: {
                thinkAndFeel: { type: Type.ARRAY, items: { type: Type.STRING } },
                see: { type: Type.ARRAY, items: { type: Type.STRING } },
                hear: { type: Type.ARRAY, items: { type: Type.STRING } },
                sayAndDo: { type: Type.ARRAY, items: { type: Type.STRING } },
                pains: { type: Type.ARRAY, items: { type: Type.STRING } },
                gains: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["thinkAndFeel", "see", "hear", "sayAndDo", "pains", "gains"]
            }
          },
          required: ["intervieweeName", "biography", "machineInsights", "canvas"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Analysis model returned an empty response.");
    }

    const cleanText = cleanJson(text);
    console.log("Cleaning and parsing JSON response...");
    const data = JSON.parse(cleanText);
    
    return {
      ...data,
      transcript: transcript
    };
  } catch (error) {
    console.error("Error during report generation:", error);
    throw error;
  }
};