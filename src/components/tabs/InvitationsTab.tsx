import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Mail, Plus, Trash2, Edit2, Download, Upload, ArrowLeft, Move, Save, CheckCircle, XCircle, HelpCircle, Copy, Check } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  background_url: string;
  config: {
    fields: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      color: string;
      align: 'left' | 'center' | 'right';
    }>;
    rsvpOptions: string[];
  };
}

interface Guest {
  id: number;
  template_id: number;
  name: string;
  position: string;
  organization: string;
  phone: string;
  email: string;
  zalo: string;
  token: string;
  rsvp_status: 'pending' | 'accepted' | 'declined';
  rsvp_options: string[];
  rsvp_comment: string;
}

export default function InvitationsTab() {
  const [activeSubView, setActiveSubView] = useState<'list' | 'design' | 'guests'>('list');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  
  // Create template form states
  const [newTemplate, setNewTemplate] = useState({ name: '', background_url: '' });
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // visual design configurator states
  const [designConfig, setDesignConfig] = useState<Template['config'] | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('name');
  const [newRsvpOption, setNewRsvpOption] = useState('');
  const [zoom, setZoom] = useState<number>(100);
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Guest list manual adding
  const [newGuest, setNewGuest] = useState({ name: '', position: '', organization: '', phone: '', email: '', zalo: '' });

  // Bulk import state
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Copied state mapping for quick links copying
  const [copiedGuestId, setCopiedGuestId] = useState<number | null>(null);

  const dragContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchTemplates = async () => {
    try {
      const data = await api('/invitations/templates');
      setTemplates(data);
    } catch (e) {
      console.error("Fetch templates error:", e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.background_url) {
      alert("Please enter template name and upload background image.");
      return;
    }
    try {
      const template = await api('/invitations/templates', {
        method: 'POST',
        body: JSON.stringify(newTemplate)
      });
      setNewTemplate({ name: '', background_url: '' });
      fetchTemplates();
      alert("Template created successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to create template");
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api('/upload', {
        method: 'POST',
        body: formData
      });
      setNewTemplate(prev => ({ ...prev, background_url: response.url }));
      alert("Background image uploaded successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to upload image");
    } finally {
      setUploadingBg(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template and all its guests?")) return;
    try {
      await api(`/invitations/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (e: any) {
      alert(e.message || "Failed to delete template");
    }
  };

  // --- Visual Design Coordinate drag & drop ---
  const handleOpenDesigner = (t: Template) => {
    setSelectedTemplate(t);
    setDesignConfig(JSON.parse(JSON.stringify(t.config))); // Deep copy config
    setSelectedFieldId('name');
    setActiveSubView('design');
    setZoom(100);
    setImgSize({ width: 0, height: 0 });
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0
    });
  };

  const handleFieldChange = (fieldId: string, key: string, value: any) => {
    if (!designConfig) return;
    setDesignConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        fields: prev.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f)
      };
    });
  };

  const handleDragStart = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    setSelectedFieldId(fieldId);
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !designConfig || !dragContainerRef.current) return;
    
    const container = dragContainerRef.current;
    const rect = container.getBoundingClientRect();

    // Calculate mouse position relative ratio (0 to 1) from container boundaries
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    setDesignConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        fields: prev.fields.map(f => f.id === selectedFieldId ? { ...f, x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) } : f)
      };
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleAddRsvpOption = () => {
    if (!newRsvpOption.trim() || !designConfig) return;
    setDesignConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        rsvpOptions: [...(prev.rsvpOptions || []), newRsvpOption.trim()]
      };
    });
    setNewRsvpOption('');
  };

  const handleRemoveRsvpOption = (index: number) => {
    if (!designConfig) return;
    setDesignConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        rsvpOptions: (prev.rsvpOptions || []).filter((_, i) => i !== index)
      };
    });
  };

  const handleSaveDesign = async () => {
    if (!selectedTemplate || !designConfig) return;
    try {
      const updated = await api(`/invitations/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: selectedTemplate.name,
          background_url: selectedTemplate.background_url,
          config: designConfig
        })
      });
      setSelectedTemplate(updated);
      fetchTemplates();
      alert("Template layout configuration saved successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to save template configuration");
    }
  };

  // --- Guests management dashboard ---
  const handleOpenGuestsDashboard = async (t: Template) => {
    setSelectedTemplate(t);
    setActiveSubView('guests');
    fetchGuests(t.id);
  };

  const fetchGuests = async (templateId: number) => {
    try {
      const data = await api(`/invitations/templates/${templateId}/guests`);
      setGuests(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddGuest = async () => {
    if (!newGuest.name) {
      alert("Name is required.");
      return;
    }
    if (!selectedTemplate) return;

    try {
      await api(`/invitations/templates/${selectedTemplate.id}/guests`, {
        method: 'POST',
        body: JSON.stringify(newGuest)
      });
      setNewGuest({ name: '', position: '', organization: '', phone: '', email: '', zalo: '' });
      fetchGuests(selectedTemplate.id);
    } catch (e: any) {
      alert(e.message || "Failed to add guest");
    }
  };

  const handleDeleteGuest = async (id: number) => {
    if (!confirm("Are you sure you want to delete this guest?")) return;
    try {
      await api(`/invitations/guests/${id}`, { method: 'DELETE' });
      if (selectedTemplate) fetchGuests(selectedTemplate.id);
    } catch (e: any) {
      alert(e.message || "Failed to delete guest");
    }
  };

  // --- CSV Import ---
  const handleDownloadSampleCsv = () => {
    const headers = ['name', 'position', 'organization', 'phone', 'email', 'zalo'];
    const sampleRows = [
      ['Nguyễn Văn A', 'Trọng tài', 'MTE Lab', '0912345678', 'referee@mtelab.com', '0912345678'],
      ['Trần Thị B', 'Vận động viên', 'Pickleball Hà Nội', '0987654321', 'player@hanoi.com', '']
    ];
    // Prefix UTF-8 BOM to prevent Excel Vietnamese accent encoding distortion
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "invitation_guests_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length < 2) {
          throw new Error("CSV file must have a header row and at least one guest row.");
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const nameIdx = headers.indexOf('name');
        const posIdx = headers.indexOf('position');
        const orgIdx = headers.indexOf('organization');
        const phoneIdx = headers.indexOf('phone');
        const emailIdx = headers.indexOf('email');
        const zaloIdx = headers.indexOf('zalo');

        if (nameIdx === -1) {
          throw new Error("CSV must contain a 'name' column.");
        }

        const parsedGuests = [];
        for (let i = 1; i < lines.length; i++) {
          // Simple CSV line parser handling comma splits
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length === 0 || !cols[nameIdx]) continue;

          parsedGuests.push({
            name: cols[nameIdx] || '',
            position: posIdx !== -1 ? cols[posIdx] || '' : '',
            organization: orgIdx !== -1 ? cols[orgIdx] || '' : '',
            phone: phoneIdx !== -1 ? cols[phoneIdx] || '' : '',
            email: emailIdx !== -1 ? cols[emailIdx] || '' : '',
            zalo: zaloIdx !== -1 ? cols[zaloIdx] || '' : ''
          });
        }

        if (parsedGuests.length === 0) {
          throw new Error("No valid guests found to import.");
        }

        // Post parsed JSON array to backend bulk import
        await api(`/invitations/templates/${selectedTemplate.id}/import`, {
          method: 'POST',
          body: JSON.stringify({ guests: parsedGuests })
        });

        alert(`Successfully imported ${parsedGuests.length} guests!`);
        fetchGuests(selectedTemplate.id);
      } catch (err: any) {
        alert(err.message || "Failed to parse CSV. Please check formatting.");
      } finally {
        setImporting(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // --- Export Excel results containing Vietnamese UTF-8 BOM ---
  const handleExportExcel = () => {
    if (!selectedTemplate || guests.length === 0) return;

    const headers = ['Full Name', 'Position', 'Organization', 'Phone', 'Email', 'Zalo', 'RSVP Status', 'RSVP Choices', 'Comment', 'Invitation Link'];
    const rows = guests.map(g => [
      `"${g.name.replace(/"/g, '""')}"`,
      `"${g.position.replace(/"/g, '""')}"`,
      `"${g.organization.replace(/"/g, '""')}"`,
      `"${(g.phone || '').replace(/"/g, '""')}"`,
      `"${(g.email || '').replace(/"/g, '""')}"`,
      `"${(g.zalo || '').replace(/"/g, '""')}"`,
      `"${g.rsvp_status}"`,
      `"${(g.rsvp_options || []).join('; ').replace(/"/g, '""')}"`,
      `"${(g.rsvp_comment || '').replace(/"/g, '""')}"`,
      `"${window.location.protocol}//${window.location.host}/invite?t=${g.token}"`
    ]);

    // Prepend BOM to force Excel to load correctly in UTF-8
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedTemplate.name}_Guest_RSVP_List.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Copy individual Link
  const handleCopyLink = (token: string, id: number) => {
    const inviteLink = `${window.location.protocol}//${window.location.host}/invite?t=${token}`;
    try {
      navigator.clipboard.writeText(inviteLink);
    } catch (e) {
      console.warn(e);
    }
    setCopiedGuestId(id);
    setTimeout(() => setCopiedGuestId(null), 1500);
  };

  // Statistics calculators
  const statsTotal = guests.length;
  const statsAccepted = guests.filter(g => g.rsvp_status === 'accepted').length;
  const statsDeclined = guests.filter(g => g.rsvp_status === 'declined').length;
  const statsPending = guests.filter(g => g.rsvp_status === 'pending').length;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[500px]">
      {/* Subview 1: Templates List */}
      {activeSubView === 'list' && (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[#0a0a0a]">INVITATION TEMPLATES</h2>
              <p className="text-gray-400 text-xs mt-1">Design invitation cards and manage guest lists for tournaments & events.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Upload new template */}
            <div className="lg:col-span-4 bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Create Invitation</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Grand Opening Gala"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Backdrop Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Image URL or upload ->"
                      value={newTemplate.background_url}
                      onChange={e => setNewTemplate({ ...newTemplate, background_url: e.target.value })}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-[10px] outline-none font-mono font-bold"
                    />
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      disabled={uploadingBg}
                      className="bg-black hover:bg-gray-800 text-white px-3 rounded-xl disabled:opacity-50 flex items-center justify-center shrink-0"
                    >
                      {uploadingBg ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Upload size={14} />}
                    </button>
                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                  </div>
                </div>

                <button
                  onClick={handleCreateTemplate}
                  className="w-full py-3 bg-[#D4FF00] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#bce600] active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow mt-2"
                >
                  <Plus size={16} /> Create Template
                </button>
              </div>
            </div>

            {/* Right side: Templates list */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Existing Templates ({templates.length})</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map(t => (
                  <div
                    key={t.id}
                    className="border border-gray-100 rounded-2xl overflow-hidden hover:border-[#D4FF00] hover:shadow-lg transition-all flex flex-col bg-white"
                  >
                    <div className="h-32 bg-gray-100 overflow-hidden relative group">
                      <img src={t.background_url} alt={t.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDesigner(t)}
                          className="px-3 py-1.5 bg-[#D4FF00] text-black font-bold text-[10px] uppercase tracking-wider rounded-lg hover:scale-105 transition-transform flex items-center gap-1"
                        >
                          <Edit2 size={10} /> Design
                        </button>
                        <button
                          onClick={() => handleOpenGuestsDashboard(t)}
                          className="px-3 py-1.5 bg-white text-black font-bold text-[10px] uppercase tracking-wider rounded-lg hover:scale-105 transition-transform flex items-center gap-1"
                        >
                          <Mail size={10} /> Guests
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-black text-base text-gray-900 truncate">{t.name}</h4>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 mt-0.5 block">
                          Fields: {t.config?.fields?.length || 0} configured
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                        <button
                          onClick={() => handleOpenGuestsDashboard(t)}
                          className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1.5"
                        >
                          Guests Dashboard &rarr;
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold uppercase tracking-wider text-xs">
                    No invitation templates created.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subview 2: Drag and Drop Coordinate Designer */}
      {activeSubView === 'design' && selectedTemplate && designConfig && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveSubView('list'); setSelectedTemplate(null); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">TEMPLATES EDITOR</span>
                <h3 className="text-xl font-black text-gray-900 leading-none mt-1">Design Layout: {selectedTemplate.name}</h3>
              </div>
            </div>
            <button
              onClick={handleSaveDesign}
              className="px-5 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow"
            >
              <Save size={14} /> Save Config
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Drag Board Canvas Column */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-100 rounded-3xl relative select-none">
              
              {/* Zoom and Workspace Control Bar */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-4 shadow-sm gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Move size={12} /> Kéo thả nhãn chữ bên dưới để căn chỉnh vị trí
                </span>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setZoom(prev => Math.max(10, prev - 10))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-gray-700 font-black transition-all"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={zoom}
                    onChange={e => setZoom(parseInt(e.target.value))}
                    className="w-24 accent-black cursor-pointer"
                  />
                  <button
                    onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-gray-700 font-black transition-all"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <span className="text-[11px] font-mono font-black text-gray-900 min-w-[36px] text-right">{zoom}%</span>
                  <button
                    onClick={() => setZoom(100)}
                    className="px-2.5 py-1 border border-gray-200 hover:border-black rounded-lg text-[9px] font-black uppercase text-gray-600 hover:text-black transition-colors"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Viewport Workspace containing template image and labels */}
              <div className="w-full h-[600px] overflow-auto bg-gray-950 border border-gray-900 rounded-2xl shadow-inner relative flex items-start justify-start p-6">
                <div
                  ref={dragContainerRef}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  className="relative shadow-2xl border border-white/5 select-none mx-auto shrink-0 bg-black/40 rounded-xl overflow-hidden"
                  style={(() => {
                    let displayWidth = imgSize.width || 420;
                    let displayHeight = imgSize.height || 420;

                    if (imgSize.width && imgSize.height) {
                      displayWidth = imgSize.width;
                      displayHeight = imgSize.height;

                      if (displayWidth > 1920 || displayHeight > 1920) {
                        if (displayWidth > displayHeight) {
                          displayWidth = 1920;
                          displayHeight = (1920 / imgSize.width) * imgSize.height;
                        } else {
                          displayHeight = 1920;
                          displayWidth = (1920 / imgSize.height) * imgSize.width;
                        }
                      }
                    }

                    const finalWidth = `${displayWidth * (zoom / 100)}px`;
                    const finalHeight = imgSize.width ? `${displayHeight * (zoom / 100)}px` : 'auto';

                    return {
                      width: finalWidth,
                      height: finalHeight,
                      minWidth: finalWidth,
                    };
                  })()}
                >
                  <img
                    src={selectedTemplate.background_url}
                    alt="Backdrop"
                    onLoad={handleImgLoad}
                    className="w-full h-full pointer-events-none select-none block object-contain"
                  />

                  {/* Absolute overlay labels */}
                  {designConfig.fields.map(field => {
                    const isSelected = field.id === selectedFieldId;
                    return (
                      <div
                        key={field.id}
                        onMouseDown={(e) => handleDragStart(e, field.id)}
                        className={`absolute px-2 py-1 border rounded cursor-move select-none flex items-center gap-1.5 transition-all text-xs font-bold ${
                          isSelected
                            ? 'border-[#D4FF00] bg-[#D4FF00]/10 text-black shadow-lg ring-2 ring-[#D4FF00]'
                            : 'border-white/40 bg-black/60 text-white hover:border-white shadow'
                        }`}
                        style={{
                          top: `${field.y * 100}%`,
                          left: `${field.x * 100}%`,
                          transform: `translate(${field.align === 'center' ? '-50%' : field.align === 'right' ? '-100%' : '0'}, -50%)`,
                          fontSize: `${field.fontSize * (zoom / 100)}px`,
                          fontFamily: field.fontFamily || 'sans-serif',
                          fontWeight: field.fontWeight || 'bold',
                          color: field.color || '#ffffff'
                        }}
                      >
                        <span>{field.label}</span>
                        <Move size={10} className="opacity-50" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar properties editor Column */}
            <div className="lg:col-span-5 space-y-6">
              {/* Sidebar card 1: Typography configuration */}
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Typography properties</h4>
                
                <div className="grid grid-cols-3 gap-2">
                  {designConfig.fields.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFieldId(f.id)}
                      className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                        selectedFieldId === f.id
                          ? 'bg-[#D4FF00]/10 border-[#D4FF00] text-black font-black'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500'
                      }`}
                    >
                      {f.id}
                    </button>
                  ))}
                </div>

                {designConfig.fields.filter(f => f.id === selectedFieldId).map(field => (
                  <div key={field.id} className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Font Size ({field.fontSize}px)</label>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={64}
                        value={field.fontSize}
                        onChange={e => handleFieldChange(field.id, 'fontSize', parseInt(e.target.value))}
                        className="w-full accent-black"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Font Family</label>
                        <select
                          value={field.fontFamily || 'sans-serif'}
                          onChange={e => handleFieldChange(field.id, 'fontFamily', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none font-bold"
                        >
                          <option value="sans-serif">Sans Serif (Mặc định)</option>
                          <option value="serif">Serif (Mặc định)</option>
                          <option value="monospace">Monospace</option>
                          <option value="Inter">Inter (Hiện đại)</option>
                          <option value="Montserrat">Montserrat (Mạnh mẽ)</option>
                          <option value="Dancing Script">Dancing Script (Cá tính)</option>
                          <option value="Charm">Charm (Mềm mại)</option>
                          <option value="Marck Script">Marck Script (Bay bổng)</option>
                          <option value="Pattaya">Pattaya (Nghệ thuật)</option>
                          <option value="Itim">Itim (Dễ thương)</option>
                          <option value="Bad Script">Bad Script (Tự nhiên)</option>
                          <option value="Lobster">Lobster (Cổ điển)</option>
                          <option value="Cinzel">Cinzel (Cổ kính)</option>
                          <option value="Playfair Display">Playfair Display (Sang trọng)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Font Weight</label>
                        <select
                          value={field.fontWeight || 'bold'}
                          onChange={e => handleFieldChange(field.id, 'fontWeight', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none font-bold"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="900">Bolder</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                        <select
                          value={field.align || 'center'}
                          onChange={e => handleFieldChange(field.id, 'align', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none font-bold"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Text Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="color"
                            value={field.color || '#ffffff'}
                            onChange={e => handleFieldChange(field.id, 'color', e.target.value)}
                            className="w-8 h-8 rounded border border-gray-200 cursor-pointer overflow-hidden bg-transparent"
                          />
                          <span className="text-xs font-mono font-bold uppercase">{field.color || '#ffffff'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar card 2: Custom checkboxes configurations */}
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">RSVP dynamic options</h4>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tham gia tiệc Gala"
                    value={newRsvpOption}
                    onChange={e => setNewRsvpOption(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRsvpOption()}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleAddRsvpOption}
                    className="p-2.5 bg-black hover:bg-gray-800 text-white rounded-xl active:scale-95 transition-transform flex items-center justify-center shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(designConfig.rsvpOptions || []).map((option, idx) => (
                    <div key={idx} className="flex justify-between items-center px-4 py-2.5 bg-white border border-gray-100 rounded-xl">
                      <span className="text-xs font-bold text-gray-800">{option}</span>
                      <button
                        onClick={() => handleRemoveRsvpOption(idx)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {(designConfig.rsvpOptions || []).length === 0 && (
                    <div className="py-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-dashed border-gray-200 rounded-xl">
                      No custom options configured.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subview 3: Guest & RSVP Dashboard */}
      {activeSubView === 'guests' && selectedTemplate && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveSubView('list'); setSelectedTemplate(null); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors animate-in"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GUESTS DASHBOARD</span>
                <h3 className="text-xl font-black text-gray-900 leading-none mt-1">Guests List: {selectedTemplate.name}</h3>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadSampleCsv}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                title="Download CSV templates structure"
              >
                <Download size={14} /> Sample CSV
              </button>
              <button
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow"
                title="Import guest list from CSV"
              >
                {importing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Upload size={14} />} Import CSV
              </button>
              <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={handleImportCsv} />

              {guests.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-[#D4FF00] hover:bg-[#bce600] text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow"
                  title="Export results Excel spreadsheet"
                >
                  <Download size={14} /> Export Results
                </button>
              )}
            </div>
          </div>

          {/* RSVP Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Guests</span>
              <div className="text-3xl font-black mt-1 text-gray-900">{statsTotal}</div>
            </div>
            <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
              <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block flex items-center gap-1"><CheckCircle size={10} /> Will Attend</span>
              <div className="text-3xl font-black mt-1 text-green-700">{statsAccepted}</div>
            </div>
            <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block flex items-center gap-1"><XCircle size={10} /> Declined</span>
              <div className="text-3xl font-black mt-1 text-red-700">{statsDeclined}</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block flex items-center gap-1"><HelpCircle size={10} /> Pending</span>
              <div className="text-3xl font-black mt-1 text-blue-700">{statsPending}</div>
            </div>
          </div>

          {/* Add single Guest Panel */}
          <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Quick Add Guest</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <input type="text" placeholder="Full Name *" value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold" />
              <input type="text" placeholder="Position" value={newGuest.position} onChange={e => setNewGuest({ ...newGuest, position: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold" />
              <input type="text" placeholder="Organization" value={newGuest.organization} onChange={e => setNewGuest({ ...newGuest, organization: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold" />
              <input type="text" placeholder="Phone" value={newGuest.phone} onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold" />
              <input type="text" placeholder="Email" value={newGuest.email} onChange={e => setNewGuest({ ...newGuest, email: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#D4FF00] font-bold" />
              <button onClick={handleAddGuest} className="bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 py-2 shadow transition-transform active:scale-95">
                <Plus size={14} /> Add Guest
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <th className="p-4">Name</th>
                    <th className="p-4">Position / Org</th>
                    <th className="p-4">Phone / Email</th>
                    <th className="p-4">RSVP Status</th>
                    <th className="p-4">Preferences</th>
                    <th className="p-4">Message</th>
                    <th className="p-4">Invitation Link</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                  {guests.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-black text-gray-900">{g.name}</td>
                      <td className="p-4">
                        <div className="font-bold">{g.position || '-'}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{g.organization || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{g.phone || '-'}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{g.email || '-'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          g.rsvp_status === 'accepted'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : g.rsvp_status === 'declined'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {g.rsvp_status === 'accepted' ? '✓ Attend' : g.rsvp_status === 'declined' ? '✕ Decline' : '• Pending'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="max-w-[150px] truncate" title={(g.rsvp_options || []).join(', ')}>
                          {(g.rsvp_options || []).join(', ') || '-'}
                        </div>
                      </td>
                      <td className="p-4 max-w-[150px] truncate" title={g.rsvp_comment}>
                        {g.rsvp_comment || '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-gray-400 max-w-[100px] truncate">
                            {g.token}
                          </span>
                          <button
                            onClick={() => handleCopyLink(g.token, g.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-all shrink-0"
                            title="Copy invitation link"
                          >
                            {copiedGuestId === g.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteGuest(g.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete guest"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {guests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                        No guests imported yet. Upload a CSV list to generate secure links!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
