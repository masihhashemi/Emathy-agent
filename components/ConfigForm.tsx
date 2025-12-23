import React, { useState } from 'react';
import { DeepResearchData, InterviewStyle, InterviewMode } from '../types';

interface ConfigFormProps {
  onSubmit: (data: DeepResearchData, isDemo: boolean) => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onSubmit }) => {
  const [challenge, setChallenge] = useState('');
  const [context, setContext] = useState('');
  const [style, setStyle] = useState<InterviewStyle>(InterviewStyle.DIRECT);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.VOICE);
  const [emails, setEmails] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Use the File API to read text directly
      const text = await file.text();
      setContext((prev) => {
        const separator = prev ? '\n\n' : '';
        return `${prev}${separator}--- Imported File: ${file.name} ---\n${text}`;
      });
    } catch (err) {
      console.error("Error reading file", err);
      alert("Failed to read the file. Please ensure it is a text-based format (.txt, .md, .json, .csv).");
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleSubmit = (isDemo: boolean) => {
    let finalChallenge = challenge;
    let finalContext = context;

    // Default values for quick demo only if EVERYTHING is empty
    if (isDemo && !finalChallenge && !finalContext) {
      finalChallenge = "Improve the remote onboarding experience for new software engineers.";
      finalContext = "Deep research indicates that new hires feel isolated in the first 2 weeks. They struggle with undocumented legacy code and lack of social bonding. Recent studies show 30% turnover in first 6 months due to 'imposter syndrome' exacerbated by remote work.";
    }

    onSubmit({
      challenge: finalChallenge,
      context: finalContext,
      style,
      mode
    }, isDemo);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
      <div className="mb-8 border-b border-indigo-900/50 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Empathy Agent Setup
        </h1>
        <p className="text-slate-400 mt-2">Configure the deep research context and interview parameters.</p>
      </div>

      <div className="space-y-6">
        {/* Challenge Input */}
        <div>
          <label className="block text-indigo-300 text-sm font-semibold mb-2">
            Design Challenge / Research Goal
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            placeholder="e.g. Understand why users abandon the checkout process..."
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
          />
        </div>

        {/* Deep Research Section (Unified) */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-indigo-300 text-sm font-semibold">
              Deep Research Context (Optional)
            </label>
            <label className="text-xs text-indigo-400 hover:text-white cursor-pointer flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors border border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Text File
              <input 
                type="file" 
                accept=".txt,.md,.json,.csv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 h-40 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono text-sm leading-relaxed"
              placeholder="Paste research text here, or click 'Import Text File' to load content..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            This context helps the agent ask smarter questions. Supported import formats: .txt, .md, .json, .csv
          </p>
        </div>

        {/* Style & Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-indigo-300 text-sm font-semibold mb-2">
                Interview Style
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setStyle(InterviewStyle.DIRECT)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    style === InterviewStyle.DIRECT
                      ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="font-bold block">Direct & Structured</span>
                  <span className="text-xs opacity-75">Efficient validation questions.</span>
                </button>
                <button
                  onClick={() => setStyle(InterviewStyle.INDIRECT)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left ${
                    style === InterviewStyle.INDIRECT
                      ? 'bg-purple-900/40 border-purple-500 ring-1 ring-purple-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="font-bold block">Conversational (Indirect)</span>
                  <span className="text-xs opacity-75">Deep discovery & mirroring.</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-indigo-300 text-sm font-semibold mb-2">
                Interaction Mode
              </label>
               <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode(InterviewMode.VOICE)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left flex items-center gap-3 ${
                    mode === InterviewMode.VOICE
                      ? 'bg-teal-900/40 border-teal-500 ring-1 ring-teal-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                   <div>
                    <span className="font-bold block">Voice Interview</span>
                    <span className="text-xs opacity-75">Real-time audio conversation.</span>
                   </div>
                </button>
                <button
                  onClick={() => setMode(InterviewMode.TEXT)}
                  className={`p-3 rounded-lg border text-sm transition-all text-left flex items-center gap-3 ${
                    mode === InterviewMode.TEXT
                      ? 'bg-orange-900/40 border-orange-500 ring-1 ring-orange-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                   <div>
                    <span className="font-bold block">Text Chat</span>
                    <span className="text-xs opacity-75">Type-based instant messaging.</span>
                   </div>
                </button>
              </div>
            </div>
        </div>

        {/* Email List (Only for Campaign) */}
        <div>
          <label className="block text-indigo-300 text-sm font-semibold mb-2">
            Target Interviewees (Emails)
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="email1@example.com, email2@example.com..."
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="pt-6 flex flex-col md:flex-row gap-4 border-t border-slate-800">
          <button
            onClick={() => handleSubmit(false)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Launch Campaign
          </button>
          
          <button
            onClick={() => handleSubmit(true)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Instant Demo Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigForm;