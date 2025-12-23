import React, { useState } from 'react';
import ConfigForm from './components/ConfigForm';
import InterviewSession from './components/InterviewSession';
import ReportView from './components/ReportView';
import { AppScreen, DeepResearchData, InterviewReport } from './types';
import { generateReport } from './services/geminiService';

function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.CONFIG);
  const [config, setConfig] = useState<DeepResearchData | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Initial Config
  const handleConfigSubmit = (data: DeepResearchData, isDemo: boolean) => {
    setConfig(data);
    setError(null);
    if (isDemo) {
      setScreen(AppScreen.INTERVIEW);
    } else {
      setScreen(AppScreen.EMAIL_SIMULATION);
    }
  };

  // Handle Interview Completion
  const handleInterviewComplete = async (transcript: string) => {
    if (!config) return;
    setLoadingReport(true);
    setScreen(AppScreen.REPORT);
    setError(null);
    
    try {
      const apiKey = process.env.API_KEY || '';
      console.log("Generating report from transcript of length:", transcript.length);
      const data = await generateReport(apiKey, transcript, config);
      setReport(data);
    } catch (err: any) {
      console.error("Report Generation Failed", err);
      const errorMsg = err.message || "An unexpected error occurred during analysis.";
      setError(errorMsg);
      // Stay on report screen so error is visible, or handle it here
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation / Branding */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Empathy Agent
              </span>
              <span className="ml-3 px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                Deep Research Beta
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10 px-4">
        {screen === AppScreen.CONFIG && (
          <ConfigForm onSubmit={handleConfigSubmit} />
        )}

        {screen === AppScreen.EMAIL_SIMULATION && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="text-indigo-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Campaign Active</h2>
            <p className="text-slate-400 mb-8">
              Agents are emailing your target list ({config?.style} style). 
              Waiting for participants to click their unique interview links...
            </p>
            
            <div className="animate-pulse flex flex-col gap-4 max-w-sm mx-auto">
               <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-300">Sarah J.</div>
                    <div className="text-xs text-slate-500">sarah@example.com</div>
                  </div>
                  <button 
                    onClick={() => setScreen(AppScreen.INTERVIEW)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded text-white transition-colors"
                  >
                    Simulate "Join"
                  </button>
               </div>
            </div>
          </div>
        )}

        {screen === AppScreen.INTERVIEW && config && (
          <InterviewSession config={config} onComplete={handleInterviewComplete} />
        )}

        {screen === AppScreen.REPORT && (
          <>
            {loadingReport ? (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white">Analyzing Session...</h2>
                <p className="text-slate-400 mt-2 text-center max-w-md">
                    Our AI is currently "thinking" through the nuances of the conversation to generate deep psychological insights. This can take up to 60 seconds.
                </p>
              </div>
            ) : error ? (
              <div className="max-w-2xl mx-auto bg-slate-900 border border-red-900/30 rounded-xl p-8 text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white mb-2">Analysis Failed</h2>
                <p className="text-slate-400 mb-6">{error}</p>
                <button 
                    onClick={() => setScreen(AppScreen.CONFIG)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Back to Settings
                </button>
              </div>
            ) : (
               report && <ReportView report={report} onRestart={() => setScreen(AppScreen.CONFIG)} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;