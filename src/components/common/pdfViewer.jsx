import { useState, useEffect, useRef } from 'react';
import { Download, ExternalLink, FileText, X, Loader } from 'lucide-react';

// ✅ Convert document.url to API route URL
// document.url = /uploads/insurance-documents/filename.pdf
// becomes       = http://localhost:5000/api/v1/files/insurance-documents/filename.pdf


function PdfViewer({ apiUrl, downloadUrl, name }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobRef = useRef(null);

  useEffect(() => {
    if (!apiUrl) {
      setError('No file URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setBlobUrl(null);

    // ✅ Use XMLHttpRequest — more reliable than fetch in some environments
    const xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Accept', 'application/pdf');

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = new Blob([xhr.response], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
        setLoading(false);
      } else {
        setError(`Server returned ${xhr.status}`);
        setLoading(false);
      }
    };

    xhr.onerror = () => {
      setError('Network error — check if backend is running');
      setLoading(false);
    };

    xhr.ontimeout = () => {
      setError('Request timed out');
      setLoading(false);
    };

    xhr.timeout = 30000;
    xhr.send();

    return () => {
      xhr.abort();
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [apiUrl]);

  // ── Loading ──
  if (loading) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-white"
        style={{ minHeight: '65vh' }}
      >
        <Loader size={36} className="animate-spin text-blue-600" />
        <p className="font-semibold text-slate-600">Loading PDF...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-white p-6"
        style={{ minHeight: '65vh' }}
      >
        <FileText size={52} className="text-red-300" />
        <p className="text-lg font-extrabold text-slate-800">Failed to load PDF</p>
        <p className="text-sm font-semibold text-red-500">{error}</p>
        <div className="mt-2 max-w-md rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <b>Try:</b>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Disable IDM browser extension</li>
            <li>Download and open locally</li>
            <li>Open in new tab</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <a
            href={downloadUrl}
            download
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download size={16} /> Download File
          </a>
          <a
            href={apiUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-light inline-flex items-center gap-2"
          >
            <ExternalLink size={16} /> Open in New Tab
          </a>
        </div>
      </div>
    );
  }

  // ── Success — blob iframe ──
  if (blobUrl) {
    return (
      <iframe
        key={blobUrl}
        title={name || 'PDF Document'}
        src={blobUrl}
        className="w-full rounded-2xl border-0 bg-white"
        style={{ minHeight: '70vh', height: '70vh' }}
      />
    );
  }

  return null;
}



export default PdfViewer;