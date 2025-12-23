import React from 'react';
import { InterviewReport } from '../types';

interface ReportViewProps {
  report: InterviewReport;
  onRestart: () => void;
}

const CanvasCard: React.FC<{ title: string; items: string[]; color: string; icon: React.ReactNode }> = ({ title, items, color, icon }) => (
  <div className={`p-4 rounded-xl bg-slate-900 border ${color} h-full`}>
    <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
      {icon}
      <h3 className="font-bold text-slate-100 uppercase tracking-wide text-sm">{title}</h3>
    </div>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="text-slate-300 text-sm flex gap-2 items-start">
          <span className="text-slate-600 mt-1">•</span>
          {item}
        </li>
      ))}
      {items.length === 0 && <li className="text-slate-600 italic text-xs">No specific data points gathered.</li>}
    </ul>
  </div>
);

const ReportView: React.FC<ReportViewProps> = ({ report, onRestart }) => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      
      {/* Header Bio */}
      <div className="mb-8 bg-slate-900/80 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">{report.intervieweeName}</h1>
                <div className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-4">Subject Profile</div>
                <p className="text-slate-300 leading-relaxed max-w-3xl">{report.biography}</p>
            </div>
            <button onClick={onRestart} className="text-sm text-slate-500 hover:text-white underline">Start New</button>
        </div>
      </div>

      {/* Empathy Canvas Grid */}
      <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-indigo-500 pl-4">Empathy Canvas</h2>
      
      {/* Top: Think/Feel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
             <CanvasCard 
                title="Think & Feel" 
                items={report.canvas.thinkAndFeel} 
                color="border-indigo-500/50" 
                icon={<svg className="text-indigo-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
            />
        </div>
      </div>

      {/* Middle: See, Hear, Say/Do */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <CanvasCard 
            title="See" 
            items={report.canvas.see} 
            color="border-blue-500/30" 
            icon={<svg className="text-blue-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
        />
        <CanvasCard 
            title="Say & Do" 
            items={report.canvas.sayAndDo} 
            color="border-purple-500/30" 
            icon={<svg className="text-purple-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>}
        />
        <CanvasCard 
            title="Hear" 
            items={report.canvas.hear} 
            color="border-cyan-500/30" 
            icon={<svg className="text-cyan-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>}
        />
      </div>

      {/* Bottom: Pains & Gains */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <CanvasCard 
            title="Pains (Frustrations)" 
            items={report.canvas.pains} 
            color="border-red-500/40" 
            icon={<svg className="text-red-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
        />
        <CanvasCard 
            title="Gains (Motivations)" 
            items={report.canvas.gains} 
            color="border-emerald-500/40" 
            icon={<svg className="text-emerald-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>}
        />
      </div>

      {/* Machine Insights */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <svg className="text-yellow-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><line x1="12" y1="22" x2="12" y2="12"></line><line x1="2.2" y1="7.5" x2="11.5" y2="12.5"></line><line x1="21.8" y1="7.5" x2="12.5" y2="12.5"></line></svg>
            Machine Intelligence Insights
        </h2>
        <div className="prose prose-invert max-w-none text-slate-300">
            <div dangerouslySetInnerHTML={{ __html: report.machineInsights.replace(/\n/g, '<br/>') }} />
        </div>
      </div>
      
      {/* Transcript Details */}
      <details className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
        <summary className="cursor-pointer text-slate-500 font-semibold hover:text-slate-300">View Raw Transcript</summary>
        <pre className="mt-4 whitespace-pre-wrap text-xs text-slate-400 font-mono">
            {report.transcript}
        </pre>
      </details>
    </div>
  );
};

export default ReportView;