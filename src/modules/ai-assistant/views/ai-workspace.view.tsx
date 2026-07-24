import React, { useState } from 'react';
import { ChatPanel } from '../components/chat-panel.component';
import { GeneratorPanel } from '../components/generator-panel.component';

export const AiWorkspaceView: React.FC = () => {
  // Bound active document state for split-view workspace
  const [selectedDocId] = useState<string | null>('doc-001');
  const [docTitle] = useState<string>('Laporan Kebijakan Pembangunan Mimika 2026');

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-h1 mb-1">AI Request & Publikasi Generator</h1>
        <p className="text-body">
          Fasilitas interaksi obrolan analitis mendalam serta perakitan draf artikel otomatis berbasis rantai penalaran (*Chain of Thought*).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Chat Q&A */}
        <ChatPanel 
          selectedDocumentId={selectedDocId} 
          documentTitle={docTitle} 
        />

        {/* Kolom Kanan: Article Generator */}
        <GeneratorPanel 
          selectedDocumentId={selectedDocId} 
          documentTitle={docTitle} 
        />
      </div>
    </div>
  );
};
