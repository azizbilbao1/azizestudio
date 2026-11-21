import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Aperture, Clapperboard, Film, FolderOpen, Gauge, ImagePlus, Music2, Pause, Play, Plus, Scissors, Settings2, Sparkles, Type, Upload, Volume2, WandSparkles, X, Download } from 'lucide-react';

type Filter = 'none' | 'warm' | 'mono' | 'vivid';
const filters: { id: Filter; label: string; css: string }[] = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'warm', label: 'Cálido', css: 'sepia(.28) saturate(1.2)' },
  { id: 'mono', label: 'B&N', css: 'grayscale(1)' },
  { id: 'vivid', label: 'Vibrante', css: 'saturate(1.55) contrast(1.08)' },
];
const stamp = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const [activePanel, setActivePanel] = useState<'media' | 'text' | 'filters'>('media');

  const activeFilter = filters.find((item) => item.id === filter)?.css ?? 'none';
  const hasVideo = Boolean(fileUrl);

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const loadFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { setNotice('Elige un archivo de vídeo compatible.'); return; }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setFilter('none');
    setNotice('Vídeo añadido al proyecto.');
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0]);
  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video || !hasVideo) return;
    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) video.currentTime = trimStart;
      try { await video.play(); setPlaying(true); } catch { setNotice('No se pudo reproducir el vídeo.'); }
    } else { video.pause(); setPlaying(false); }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.currentTime >= trimEnd && !video.paused) { video.pause(); video.currentTime = trimEnd; setPlaying(false); }
  };
  const seek = (value: number) => {
    if (videoRef.current) videoRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const exportVideo = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !hasVideo) return;
    if (!('MediaRecorder' in window) || !canvas.captureStream) { setNotice('Tu navegador no admite la exportación de vídeo. Prueba la última versión de Chrome o Edge.'); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setExporting(true); setExportProgress(0); setNotice('Preparando la exportación…');
    const wasPlaying = !video.paused;
    video.pause();
    const end = Math.max(trimEnd, trimStart + 0.1);
    const stream = canvas.captureStream(30);
    const videoWithAudio = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const sourceStream = videoWithAudio.captureStream?.() ?? videoWithAudio.mozCaptureStream?.();
    sourceStream?.getAudioTracks().forEach((track) => stream.addTrack(track));
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setExporting(false); setNotice('Este navegador no ofrece un formato de exportación compatible.'); return; }
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { setExporting(false); setNotice('Hubo un problema al exportar el vídeo.'); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName.replace(/\.[^.]+$/, '') || 'azizestudio'}-editado.webm`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      stream.getTracks().forEach((track) => track.stop());
      setExporting(false); setExportProgress(100); setNotice('¡Vídeo exportado! Se ha descargado en formato WebM.');
      if (wasPlaying) video.play().catch(() => undefined);
    };
    const draw = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      ctx.filter = activeFilter;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      if (caption.trim()) {
        const fontSize = Math.max(24, Math.round(canvas.width * 0.045));
        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = Math.max(3, fontSize * 0.12); ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.fillStyle = '#fff';
        ctx.strokeText(caption, canvas.width / 2, canvas.height - fontSize * 1.4, canvas.width * .88);
        ctx.fillText(caption, canvas.width / 2, canvas.height - fontSize * 1.4, canvas.width * .88);
      }
      setExportProgress(Math.min(99, Math.round(((video.currentTime - trimStart) / (end - trimStart)) * 100)));
      if (video.currentTime >= end) { video.pause(); recorder.stop(); return; }
      requestAnimationFrame(draw);
    };
    video.currentTime = trimStart;
    await new Promise<void>((resolve) => { if (Math.abs(video.currentTime - trimStart) < 0.01 && video.readyState >= 2) resolve(); else video.addEventListener('seeked', () => resolve(), { once: true }); });
    recorder.start(250);
    try { await video.play(); draw(); } catch { recorder.stop(); setNotice('No se pudo iniciar la exportación; comprueba el vídeo e inténtalo otra vez.'); }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Azizestudio inicio"><span className="brand-mark"><Clapperboard size={20} /></span><span>aziz<span className="brand-accent">studio</span></span></a>
        <div className="project-title"><span className="status-dot" /> Proyecto sin título <span className="saved-label">Guardado localmente</span></div>
        <div className="top-actions"><button className="icon-button settings-btn" title="Ajustes"><Settings2 size={18} /></button><button className="export-button" onClick={exportVideo} disabled={!hasVideo || exporting}><Download size={16} />{exporting ? `Exportando ${exportProgress}%` : 'Exportar vídeo'}</button></div>
      </header>
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-tabs" role="tablist" aria-label="Herramientas">
            <button className={activePanel === 'media' ? 'side-tab active' : 'side-tab'} onClick={() => setActivePanel('media')}><Film size={19} /><span>Medios</span></button>
            <button className={activePanel === 'text' ? 'side-tab active' : 'side-tab'} onClick={() => { setActivePanel('text'); setShowCaptionInput(true); }}><Type size={19} /><span>Texto</span></button>
            <button className={activePanel === 'filters' ? 'side-tab active' : 'side-tab'} onClick={() => setActivePanel('filters')}><WandSparkles size={19} /><span>Filtros</span></button>
          </div>
          <section className="tool-panel">
            {activePanel === 'media' && <><div className="panel-heading"><div><h2>Medios</h2><p>Tu biblioteca del proyecto</p></div><button className="small-add" onClick={() => fileInputRef.current?.click()} title="Añadir vídeo"><Plus size={18} /></button></div><button className="upload-card" onClick={() => fileInputRef.current?.click()}><span className="upload-icon"><Upload size={19} /></span><strong>Importar vídeo</strong><small>MP4, WebM, MOV y más</small></button>{hasVideo ? <div className="media-item"><div className="media-thumb"><Film size={20} /></div><div className="media-details"><strong title={fileName}>{fileName}</strong><span>{stamp(duration)} · Vídeo</span></div><button className="remove-button" title="Quitar vídeo" onClick={() => { setFileUrl(''); setFileName(''); setDuration(0); setNotice('Vídeo quitado del proyecto.'); }}><X size={15} /></button></div> : <div className="empty-library"><FolderOpen size={22} /><span>Tus archivos aparecerán aquí</span></div>}<div className="panel-tip"><Sparkles size={16} /><span>Todo se procesa en tu navegador. Tus archivos no se suben a ningún servidor.</span></div></>}
            {activePanel === 'text' && <><div className="panel-heading"><div><h2>Texto</h2><p>Añade un título al vídeo</p></div></div><label className="field-label" htmlFor="caption">Texto superpuesto</label><textarea id="caption" className="caption-input" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Escribe tu título aquí…" maxLength={100} /><div className="char-count">{caption.length}/100</div><button className="secondary-action" onClick={() => { setCaption(''); setShowCaptionInput(false); }}>Quitar texto</button><div className="panel-tip"><Type size={16} /><span>El título aparece en la parte inferior del vídeo y se incluye al exportar.</span></div></>}
            {activePanel === 'filters' && <><div className="panel-heading"><div><h2>Filtros</h2><p>Elige un estilo para tu vídeo</p></div></div><div className="filter-grid">{filters.map((item) => <button key={item.id} className={`filter-card ${filter === item.id ? 'selected' : ''}`} onClick={() => setFilter(item.id)}><span className={`filter-preview filter-${item.id}`}><Aperture size={23} /></span><span>{item.label}</span>{filter === item.id && <span className="filter-check">✓</span>}</button>)}</div><div className="panel-tip"><Sparkles size={16} /><span>El filtro se aplica tanto a la previsualización como al vídeo exportado.</span></div></>}
          </section>
        </aside>

        <section className="editor-area">
          <div className="preview-toolbar"><div className="preview-label"><span className="live-dot" /> PREVISUALIZACIÓN</div><div className="preview-size">16:9 <span>·</span> Ajustar</div></div>
          <div className="preview-stage">
            {hasVideo ? <div className="video-frame"><video ref={videoRef} src={fileUrl} style={{ filter: activeFilter }} onLoadedMetadata={(event) => { const length = event.currentTarget.duration || 0; setDuration(length); setTrimEnd(length); }} onTimeUpdate={onTimeUpdate} onEnded={() => setPlaying(false)} playsInline /><canvas ref={canvasRef} className="export-canvas" />{caption && <div className="caption-overlay">{caption}</div>}</div> : <button className="drop-zone" onClick={() => fileInputRef.current?.click()}><span className="drop-icon"><ImagePlus size={25} /></span><strong>Empieza con un vídeo</strong><span>Arrastra un archivo aquí o <b>explora tus archivos</b></span><small>MP4, WebM, MOV · Procesamiento local y privado</small></button>}
          </div>
          <div className="transport"><button className="transport-play" onClick={togglePlayback} disabled={!hasVideo} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span className="time-readout">{stamp(currentTime)} <span>/</span> {stamp(duration)}</span><div className="transport-spacer" /><button className="transport-tool" disabled={!hasVideo} onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}><Volume2 size={17} /></button><button className="transport-tool" title="Velocidad"><Gauge size={17} /><span>1×</span></button></div>
          <section className="timeline-section"><div className="timeline-heading"><div><h2>Timeline</h2><span className="timeline-hint">Selecciona el rango que quieres conservar</span></div><div className="timeline-tools"><button title="Cortar en la posición actual" disabled={!hasVideo} onClick={() => { if (currentTime > trimStart && currentTime < trimEnd) { setTrimEnd(currentTime); setNotice('El final del recorte se ha ajustado a la posición actual.'); } }}><Scissors size={16} /></button><button title="Añadir texto" onClick={() => { setActivePanel('text'); setShowCaptionInput(true); }}><Type size={16} /></button><button title="Audio"><Music2 size={16} /></button></div></div>
            <div className={`timeline-track ${hasVideo ? 'has-clip' : ''}`}>
              <div className="track-ruler"><span>00:00</span><span>{stamp(duration * .25)}</span><span>{stamp(duration * .5)}</span><span>{stamp(duration * .75)}</span><span>{stamp(duration)}</span></div>
              <div className="clip-lane"><div className="track-label"><Film size={15} /></div>{hasVideo ? <div className="clip-track"><div className="clip-inner" style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%`, width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 100}%` }}><div className="clip-name"><Film size={13} /><span>{fileName}</span></div><div className="filmstrip">{Array.from({ length: 10 }, (_, index) => <div className={`film-cell film-cell-${index % 5}`} key={index}><span /></div>)}</div><input aria-label="Inicio del recorte" className="trim-handle trim-start" type="range" min="0" max={duration || 1} step="0.1" value={trimStart} onChange={(event) => { const next = Number(event.target.value); setTrimStart(Math.min(next, trimEnd - .1)); if (videoRef.current && videoRef.current.currentTime < next) seek(next); }} /><input aria-label="Final del recorte" className="trim-handle trim-end" type="range" min="0" max={duration || 1} step="0.1" value={trimEnd} onChange={(event) => { const next = Number(event.target.value); setTrimEnd(Math.max(next, trimStart + .1)); if (videoRef.current && videoRef.current.currentTime > next) seek(next); }} /></div><button className="playhead" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} onClick={() => seek(currentTime)} aria-label="Cabezal de reproducción" /></div> : <button className="empty-track" onClick={() => fileInputRef.current?.click()}><Plus size={15} /> Añade un vídeo para empezar</button>}</div>
              {hasVideo && <div className="scrub-row"><span>{stamp(trimStart)}</span><input aria-label="Posición de reproducción" type="range" min={trimStart} max={trimEnd || 1} step="0.01" value={Math.min(currentTime, trimEnd || 0)} onChange={(event) => seek(Number(event.target.value))} /><span>{stamp(trimEnd)}</span></div>}
            </div>
            {exporting && <div className="export-progress"><span style={{ width: `${exportProgress}%` }} /></div>}
          </section>
        </section>
      </main>
      <input ref={fileInputRef} className="hidden-input" type="file" accept="video/*" onChange={onFileChange} />
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={15} /></button></div>}
      <footer className="footer"><span><span className="footer-dot" /> Azizestudio</span><span>Hecho para crear · Tus vídeos permanecen en tu dispositivo</span><span>Versión 1.0</span></footer>
    </div>
  );
}
