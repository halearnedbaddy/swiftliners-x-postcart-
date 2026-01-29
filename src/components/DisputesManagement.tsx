import { useState } from 'react';
import { ArrowLeft, HelpCircle, Upload, Send, Paperclip, X, Eye } from 'lucide-react';

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  amount: number;
  item: string;
  reason: string;
  buyerEvidence: { type: string; url: string }[];
  status: 'open' | 'under_review' | 'resolved';
  openedAt: Date;
  deadline: Date;
  wonByYou: boolean;
}

interface UploadedFile {
  id: number;
  file: File;
  name: string;
  size: number;
  type: string;
  category: string;
  uploadedAt: Date;
  url: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'seller' | 'admin';
  timestamp: Date;
  read: boolean;
}

export function DisputesManagement() {
  const [disputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'upload' | 'communicate'>('list');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'under_review' | 'resolved'>('all');
  const [explanation, setExplanation] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      uploadedAt: new Date(),
      url: URL.createObjectURL(file)
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (fileId: number) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now(),
      text: newMessage,
      sender: 'seller',
      timestamp: new Date(),
      read: false
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const submitDisputeResponse = () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one piece of evidence before submitting.');
      return;
    }

    console.log('Submitting dispute response:', {
      disputeId: selectedDispute?.id,
      files: uploadedFiles,
      messages: messages,
      explanation
    });

    alert('Dispute response submitted successfully! Admin will review within 24-48 hours.');
    setActiveView('detail');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTimeRemaining = (deadline: Date): string => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 0) return 'Expired';
    if (hours < 24) return `${hours}h ${minutes}m remaining`;
    return `${Math.floor(hours / 24)} days remaining`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'open': return 'bg-[#4F4A41]/20 text-[#4F4A41] border-[#4F4A41]/30';
      case 'under_review': return 'bg-[#6E6658]/20 text-[#6E6658] border-[#6E6658]/30';
      case 'resolved': return 'bg-[#5d2ba3]/20 text-[#5d2ba3] border-[#5d2ba3]/30';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredDisputes = disputes.filter(d => filter === 'all' || d.status === filter);

  const createFileInput = (category: string, accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = (e) => handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>, category);
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3d1a7a]">⚠️ Dispute Management</h1>
          <p className="text-gray-600">Manage and resolve order disputes</p>
        </div>
        <button
          onClick={() => alert('Dispute Help:\n\n1. Review dispute details\n2. Upload evidence\n3. Communicate with admin\n4. Track resolution status')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-nulllg font-semibold text-sm hover:bg-gray-200 transition"
        >
          <HelpCircle size={16} />
          Help Guide
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#4F4A41] to-[#6E6658] rounded-nullxl p-6 text-white cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1">
          <div className="text-4xl mb-3">🚨</div>
          <div className="text-4xl font-bold mb-1">{disputes.filter(d => d.status === 'open').length}</div>
          <div className="font-semibold opacity-90">Open Disputes</div>
          <div className="text-sm opacity-80">Require action</div>
        </div>

        <div className="bg-gradient-to-br from-[#6E6658] to-[#4F4A41] rounded-nullxl p-6 text-white cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-4xl font-bold mb-1">{disputes.filter(d => d.status === 'under_review').length}</div>
          <div className="font-semibold opacity-90">Under Review</div>
          <div className="text-sm opacity-80">Admin reviewing</div>
        </div>

        <div className="bg-gradient-to-br from-[#5d2ba3] to-[#3d1a7a] rounded-nullxl p-6 text-white cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-4xl font-bold mb-1">{disputes.filter(d => d.status === 'resolved').length}</div>
          <div className="font-semibold opacity-90">Resolved</div>
          <div className="text-sm opacity-80">Last 30 days</div>
        </div>

        <div className="bg-gradient-to-br from-[#5d2ba3] to-[#3d1a7a] rounded-nullxl p-6 text-white cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-4xl font-bold mb-1">
            {disputes.length > 0 ? Math.round((disputes.filter(d => d.wonByYou).length / disputes.length) * 100) : 0}%
          </div>
          <div className="font-semibold opacity-90">Win Rate</div>
          <div className="text-sm opacity-80">Your favor</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto pb-2">
        {(['all', 'open', 'under_review', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-semibold whitespace-nowrap flex items-center gap-2 border-b-3 transition ${filter === f
                ? 'text-[#5d2ba3] border-b-2 border-[#5d2ba3]'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
              }`}
          >
            {f.replace('_', ' ').toUpperCase()}
            {f !== 'all' && (
              <span className="bg-[#5d2ba3] text-white px-2 py-0.5 rounded-nullfull text-xs font-semibold">
                {disputes.filter(d => d.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {disputes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-nullxl shadow-sm">
          <div className="text-6xl mb-6">🎉</div>
          <h3 className="text-xl font-bold text-[#3d1a7a] mb-2">No Active Disputes</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Great news! You don't have any disputes at the moment.
            <br />
            When a buyer opens a dispute, it will appear here.
          </p>
        </div>
      ) : (
        <>
          {activeView === 'list' && (
            <div className="space-y-4">
              {filteredDisputes.map(dispute => (
                <div
                  key={dispute.id}
                  className="bg-white rounded-nullxl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1"
                  onClick={() => {
                    setSelectedDispute(dispute);
                    setActiveView('detail');
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg">🚨 Dispute #{dispute.id}</div>
                      <div className="text-gray-600 text-sm">Order #{dispute.orderId}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-nullfull text-xs font-semibold border ${getStatusStyles(dispute.status)}`}>
                      {dispute.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div><span className="text-gray-500">Buyer:</span> <span className="font-medium">{dispute.buyer}</span></div>
                    <div><span className="text-gray-500">Amount:</span> <span className="font-medium">KES {dispute.amount.toLocaleString()}</span></div>
                    <div><span className="text-gray-500">Item:</span> <span className="font-medium">{dispute.item}</span></div>
                    <div><span className="text-gray-500">Reason:</span> <span className="font-medium text-[#4F4A41]">{dispute.reason}</span></div>
                  </div>

                  {dispute.status === 'open' && (
                    <div className="flex items-center gap-2 bg-[#4F4A41]/10 text-[#4F4A41] px-4 py-2 rounded-nulllg mb-4">
                      <span>⏰</span>
                      <span className="font-semibold">{getTimeRemaining(dispute.deadline)} to respond</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-[#5d2ba3] text-white py-2 rounded-nulllg font-semibold hover:bg-[#3d1a7a] transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDispute(dispute);
                        setActiveView('detail');
                      }}
                    >
                      View Details
                    </button>
                    {dispute.status === 'open' && (
                      <button
                        className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-nulllg font-semibold hover:bg-gray-200 transition border border-gray-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDispute(dispute);
                          setActiveView('upload');
                        }}
                      >
                        Upload Evidence
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeView === 'detail' && selectedDispute && (
            <div className="space-y-6">
              <button
                onClick={() => setActiveView('list')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold"
              >
                <ArrowLeft size={20} />
                Back to Disputes
              </button>

              <div className="bg-white rounded-nullxl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Dispute #{selectedDispute.id}</h2>
                    <p className="text-gray-600">Order #{selectedDispute.orderId}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-nullfull font-semibold border ${getStatusStyles(selectedDispute.status)}`}>
                    {selectedDispute.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Timeline */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">📅 Dispute Timeline</h3>
                  <div className="relative pl-8 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-8 w-5 h-5 bg-[#4F4A41] rounded-nullfull border-3 border-white"></div>
                      <div className="bg-gray-50 p-4 rounded-nulllg">
                        <div className="text-xs text-gray-500 font-semibold mb-1">{formatDate(selectedDispute.openedAt)}</div>
                        <div className="font-bold">🚨 Dispute opened by buyer</div>
                        <p className="text-gray-600 text-sm">Reason: "{selectedDispute.reason}"</p>
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="relative">
                        <div className="absolute -left-8 w-5 h-5 bg-[#5d2ba3] rounded-nullfull border-3 border-white"></div>
                        <div className="bg-gray-50 p-4 rounded-nulllg">
                          <div className="text-xs text-gray-500 font-semibold mb-1">{formatDate(new Date())}</div>
                          <div className="font-bold">📎 Evidence uploaded</div>
                          <p className="text-gray-600 text-sm">{uploadedFiles.length} file(s) submitted</p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute -left-8 w-5 h-5 bg-[#6E6658] rounded-nullfull border-3 border-white"></div>
                      <div className="bg-gray-50 p-4 rounded-nulllg">
                        <div className="text-xs text-gray-500 font-semibold mb-1">Pending</div>
                        <div className="font-bold">👤 Your response</div>
                        <p className="text-gray-600 text-sm">Deadline: {formatDate(selectedDispute.deadline)}</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-8 w-5 h-5 bg-gray-400 rounded-nullfull border-3 border-white"></div>
                      <div className="bg-gray-50 p-4 rounded-nulllg">
                        <div className="text-xs text-gray-500 font-semibold mb-1">Expected</div>
                        <div className="font-bold">⚖️ Admin review</div>
                        <p className="text-gray-600 text-sm">Decision within 24-48 hours after submission</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buyer Evidence */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">📸 Buyer's Evidence</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                    {selectedDispute.buyerEvidence.map((evidence, idx) => (
                      <div key={idx} className="relative aspect-square rounded-nulllg overflow-hidden border-2 border-gray-200 bg-gray-50 group">
                        {evidence.type === 'image' ? (
                          <img src={evidence.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📄</div>
                        )}
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => window.open(evidence.url, '_blank')}
                            className="flex items-center gap-2 bg-white px-4 py-2 rounded-nulllg font-semibold text-sm"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm italic">Buyer's claim: "{selectedDispute.reason}"</p>
                </div>

                {/* Your Evidence */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">🛡️ Your Evidence</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className="relative aspect-square rounded-nulllg overflow-hidden border-2 border-gray-200 bg-gray-50">
                          {file.type.startsWith('image/') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : file.type.startsWith('video/') ? (
                            <video src={file.url} className="w-full h-full object-cover" controls />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">📄</div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 text-xs">
                            <div className="font-semibold truncate">{file.name}</div>
                            <div className="opacity-80">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setActiveView('upload')}
                    className="flex items-center gap-2 bg-[#5d2ba3] text-white px-6 py-3 rounded-nulllg font-semibold hover:bg-[#3d1a7a] transition"
                  >
                    <Upload size={18} />
                    {uploadedFiles.length > 0 ? 'Add More Evidence' : 'Upload Evidence'}
                  </button>
                  <button
                    onClick={() => setActiveView('communicate')}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-nulllg font-semibold hover:bg-gray-200 transition border border-gray-300"
                  >
                    💬 Message Admin
                  </button>
                  {selectedDispute.status === 'open' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to accept the refund? This cannot be undone.')) {
                          alert('Refund accepted. Funds will be returned to buyer.');
                          setActiveView('list');
                        }
                      }}
                      className="flex items-center gap-2 bg-[#4F4A41]/10 text-[#4F4A41] px-6 py-3 rounded-nulllg font-semibold hover:bg-[#4F4A41]/20 transition border border-[#4F4A41]/30"
                    >
                      ✓ Accept Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'upload' && selectedDispute && (
            <div className="space-y-6">
              <button
                onClick={() => setActiveView('detail')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold"
              >
                <ArrowLeft size={20} />
                Back to Details
              </button>

              <div className="bg-white rounded-nullxl p-6 shadow-sm">
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold mb-2">🛡️ Upload Evidence</h2>
                  <p className="text-gray-600">Provide proof to support your case. Upload clear, timestamped evidence.</p>
                </div>

                <div className="space-y-6">
                  {/* Delivery Proof */}
                  <div className="border-2 border-gray-200 rounded-nullxl p-6">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg mb-1">📦 Proof of Delivery</h3>
                      <p className="text-gray-600 text-sm">Courier receipts, tracking screenshots, delivery confirmation</p>
                    </div>
                    <div
                      onClick={() => createFileInput('delivery', 'image/*,application/pdf')}
                      className="border-2 border-dashed border-gray-300 rounded-nulllg p-8 text-center cursor-pointer hover:border-[#5d2ba3] hover:bg-[#5d2ba3]/10 transition bg-gray-50"
                    >
                      <div className="text-4xl mb-3">📷</div>
                      <div className="font-semibold text-gray-900">Click to upload or drag files here</div>
                      <div className="text-gray-500 text-sm">PNG, JPG, PDF up to 10MB each</div>
                    </div>
                    {uploadedFiles.filter(f => f.category === 'delivery').length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.filter(f => f.category === 'delivery').map(file => (
                          <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-nulllg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                              <div>
                                <div className="font-semibold text-sm">{file.name}</div>
                                <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-8 h-8 flex items-center justify-center bg-[#4F4A41]/20 text-[#4F4A41] rounded-nullfull hover:bg-[#4F4A41]/30 transition"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Product Condition */}
                  <div className="border-2 border-gray-200 rounded-nullxl p-6">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg mb-1">📸 Product Condition Photos</h3>
                      <p className="text-gray-600 text-sm">Photos showing product was undamaged before shipping</p>
                    </div>
                    <div
                      onClick={() => createFileInput('condition', 'image/*')}
                      className="border-2 border-dashed border-gray-300 rounded-nulllg p-8 text-center cursor-pointer hover:border-[#5d2ba3] hover:bg-[#5d2ba3]/10 transition bg-gray-50"
                    >
                      <div className="text-4xl mb-3">📷</div>
                      <div className="font-semibold text-gray-900">Click to upload photos</div>
                      <div className="text-gray-500 text-sm">Show product before packaging</div>
                    </div>
                    {uploadedFiles.filter(f => f.category === 'condition').length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.filter(f => f.category === 'condition').map(file => (
                          <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-nulllg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🖼️</span>
                              <div>
                                <div className="font-semibold text-sm">{file.name}</div>
                                <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-8 h-8 flex items-center justify-center bg-[#4F4A41]/20 text-[#4F4A41] rounded-nullfull hover:bg-[#4F4A41]/30 transition"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Packing Video */}
                  <div className="border-2 border-gray-200 rounded-nullxl p-6">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg mb-1">🎥 Packing/Handling Video (Optional)</h3>
                      <p className="text-gray-600 text-sm">Video showing careful packing process</p>
                    </div>
                    <div
                      onClick={() => createFileInput('video', 'video/*')}
                      className="border-2 border-dashed border-gray-300 rounded-nulllg p-8 text-center cursor-pointer hover:border-[#5d2ba3] hover:bg-[#5d2ba3]/10 transition bg-gray-50"
                    >
                      <div className="text-4xl mb-3">🎥</div>
                      <div className="font-semibold text-gray-900">Click to upload video</div>
                      <div className="text-gray-500 text-sm">MP4, MOV up to 50MB</div>
                    </div>
                    {uploadedFiles.filter(f => f.category === 'video').length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.filter(f => f.category === 'video').map(file => (
                          <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-nulllg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🎬</span>
                              <div>
                                <div className="font-semibold text-sm">{file.name}</div>
                                <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-8 h-8 flex items-center justify-center bg-[#4F4A41]/20 text-[#4F4A41] rounded-nullfull hover:bg-[#4F4A41]/30 transition"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Written Explanation */}
                  <div className="border-2 border-gray-200 rounded-nullxl p-6">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg mb-1">✍️ Written Explanation *</h3>
                      <p className="text-gray-600 text-sm">Explain your side of the story</p>
                    </div>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      rows={6}
                      className="w-full p-4 border-2 border-gray-200 rounded-nulllg text-sm resize-y focus:border-[#5d2ba3] focus:outline-none transition"
                      placeholder="Example: The product was carefully inspected and photographed before shipping. I used bubble wrap and a padded envelope. The courier tracking shows no handling issues. The damage may have occurred after delivery..."
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="flex gap-8 p-4 bg-gray-50 rounded-nulllg mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📎</span>
                    <span className="font-semibold">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💾</span>
                    <span className="font-semibold">{formatFileSize(uploadedFiles.reduce((acc, f) => acc + f.size, 0))} total</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setActiveView('detail')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-nulllg font-semibold hover:bg-gray-200 transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitDisputeResponse}
                    className="px-6 py-3 bg-[#5d2ba3] text-white rounded-nulllg font-semibold hover:bg-[#3d1a7a] transition"
                  >
                    📤 Submit Evidence
                  </button>
                </div>

                {/* Tips */}
                <div className="flex gap-4 p-4 bg-[#5d2ba3]/10 rounded-nulllg border-l-4 border-[#5d2ba3] mt-6">
                  <div className="text-3xl">💡</div>
                  <div>
                    <div className="font-bold mb-2">Tips for Strong Evidence:</div>
                    <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                      <li>Upload clear, high-quality photos</li>
                      <li>Include timestamps when possible</li>
                      <li>Show multiple angles of the product</li>
                      <li>Include all courier documentation</li>
                      <li>Be detailed in your explanation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'communicate' && selectedDispute && (
            <div className="space-y-6">
              <button
                onClick={() => setActiveView('detail')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold"
              >
                <ArrowLeft size={20} />
                Back to Details
              </button>

              <div className="bg-white rounded-nullxl p-6 shadow-sm">
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold mb-2">💬 Message Admin</h2>
                  <p className="text-gray-600">Dispute #{selectedDispute.id} • {selectedDispute.orderId}</p>
                </div>

                {/* Message Thread */}
                <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-nulllg mb-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">💬</div>
                      <p className="font-semibold text-gray-900">No messages yet</p>
                      <p className="text-gray-500 text-sm">Start the conversation with the admin team</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-nulllg ${msg.sender === 'seller'
                              ? 'bg-white border-2 border-gray-200 ml-8'
                              : 'bg-[#5d2ba3]/10 border-2 border-[#5d2ba3]/30 mr-8'
                            }`}
                        >
                          <div className="flex justify-between mb-2">
                            <span className="font-bold text-sm">
                              {msg.sender === 'seller' ? '👤 You' : '👨‍💼 Admin'}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(msg.timestamp)}</span>
                          </div>
                          <div className="text-gray-900">{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="mb-6">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message to the admin team..."
                    rows={3}
                    className="w-full p-4 border-2 border-gray-200 rounded-nulllg text-sm resize-y focus:border-[#5d2ba3] focus:outline-none transition mb-4"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="flex gap-4 justify-end">
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = () => alert('Files attached to message');
                        input.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-nulllg font-semibold text-sm hover:bg-gray-200 transition"
                    >
                      <Paperclip size={16} />
                      Attach
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-[#5d2ba3] text-white rounded-nulllg font-semibold hover:bg-[#3d1a7a] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                {/* Quick Responses */}
                <div className="mb-6">
                  <div className="font-bold mb-4">Quick Responses:</div>
                  <div className="space-y-2">
                    {[
                      "I have uploaded additional evidence for your review.",
                      "Can you please check the tracking information I provided?",
                      "I believe there may have been a misunderstanding.",
                      "Is there any update on the review status?"
                    ].map((response, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewMessage(response)}
                        className="block w-full text-left p-3 bg-white border-2 border-gray-200 rounded-nulllg text-sm text-gray-600 hover:border-[#5d2ba3] hover:bg-[#5d2ba3]/10 transition"
                      >
                        {response}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Time Info */}
                <div className="flex gap-4 p-4 bg-[#5d2ba3]/10 rounded-nulllg border-l-4 border-[#5d2ba3]">
                  <span className="text-xl">ℹ️</span>
                  <span className="text-sm text-gray-600">
                    Admin typically responds within 2-4 hours during business hours (9 AM - 6 PM EAT)
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
