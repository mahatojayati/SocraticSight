import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { Attachment } from '../types';
import { compressImage } from '../services/imageCompression';

interface ImageUploaderProps {
  onFilesSelected: (attachments: Attachment[]) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<Attachment[]>([]);

  const processFiles = (files: FileList | File[]) => {
    const newAttachments: Attachment[] = [];
    let processedCount = 0;
    const totalFiles = files.length;

    if (totalFiles === 0) return;

    Array.from(files).forEach(file => {
      // Support images and PDFs
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          let base64Data = reader.result as string;
          let mimeType = file.type;
          
          if (file.type.startsWith('image/')) {
            base64Data = await compressImage(base64Data);
            mimeType = 'image/jpeg'; // always compression-optimized jpeg
          }

          newAttachments.push({
            mimeType,
            data: base64Data,
            name: file.name
          });
          processedCount++;
          if (processedCount === totalFiles) {
            setPreviews(prev => [...prev, ...newAttachments]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        processedCount++;
        if (processedCount === totalFiles) {
          setPreviews(prev => [...prev, ...newAttachments]);
        }
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (previews.length > 0) {
      onFilesSelected(previews);
      setPreviews([]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6 p-4">
      {/* Upload Area */}
      {previews.length === 0 ? (
        <div 
          className={`relative group border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ease-in-out cursor-pointer bg-slate-800
            ${dragActive ? 'border-indigo-500 bg-slate-800/80 scale-[1.01]' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*,application/pdf" 
            multiple
            className="hidden" 
            onChange={handleChange}
            disabled={isLoading}
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-xl">
              {isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : <Upload className="w-8 h-8" />}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {isLoading ? 'Processing...' : 'Upload Materials'}
              </h3>
              <p className="text-slate-400 max-w-xs mx-auto text-sm">
                Drop problem images or PDF notes here.
              </p>
            </div>

            <div className="flex gap-3 mt-4">
               <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs font-medium text-slate-400">
                  <ImageIcon size={14} /> Images
               </span>
               <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-xs font-medium text-slate-400">
                  <FileText size={14} /> PDFs
               </span>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Area */
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-white font-semibold">Selected Files ({previews.length})</h3>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
            >
              <Plus size={14} /> Add more
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*,application/pdf" 
              multiple
              className="hidden" 
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
            {previews.map((file, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-square flex items-center justify-center">
                {file.mimeType === 'application/pdf' ? (
                  <div className="text-center p-2">
                    <FileText className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 truncate w-full">{file.name}</p>
                  </div>
                ) : (
                  <img src={file.data} className="w-full h-full object-cover opacity-80" alt="preview" />
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Start Analysis'}
          </button>
        </div>
      )}
      
      <p className="text-center mt-6 text-slate-500 text-xs">
        Powered by Gemini 3 Pro
      </p>
    </div>
  );
};
