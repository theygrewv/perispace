let currentOrbit = 'inner', tStartX=0, currentEl=null, px=0, py=0, scale=1, topZ=100;
let mediaRecorder, audioChunks = [], pendingData = null, shiftInterval;

function boot() {
    setOrbit(localStorage.getItem('pb_orbit') || 'inner');
    loadShiftTimes();
    startShiftClock();
    renderTasks(); renderV(); loadNotes(); initCanvas(); updateCanvas();
}

function pulse(ms=10) { if("vibrate" in navigator) navigator.vibrate(ms); }

function go(id, btn) {
    pulse(7);
    document.querySelectorAll('.page, #wb-page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.style.display = (id === 'wb-page' ? 'block' : 'flex');
    btn.classList.add('active');
}

function setOrbit(o) {
    pulse(15); currentOrbit = o; localStorage.setItem('pb_orbit', o);
    document.querySelectorAll('.orbit-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${o}`).classList.add('active');
    renderTasks(); renderV();
}

/* --- MEDIA ENGINES --- */
async function startRecording() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(s); audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const r = new FileReader(); r.readAsDataURL(new Blob(audioChunks, {type:'audio/webm'})); 
            r.onloadend = () => saveSignal(r.result, 'audio');
            s.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start(); pulse(50); document.getElementById('audio-hud').style.display = 'flex';
    } catch (err) { alert("Mic Permission Denied."); }
}

function stopRecording() { if (mediaRecorder?.state !== "inactive") { mediaRecorder.stop(); document.getElementById('audio-hud').style.display = 'none'; pulse(20); } }

function captureImage() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment';
    i.onchange = e => { if(!e.target.files[0]) return; const r = new FileReader(); r.onload = ev => saveSignal(ev.target.result, 'image'); r.readAsDataURL(e.target.files[0]); }; i.click();
}

function saveSignal(data, type) {
    pulse(30); pendingData = { data, type };
    const tray = document.getElementById('pending-media');
    tray.style.display = 'block';
    tray.innerHTML = `<div class="pending-shard"><button class="remove-pending" onclick="clearPending()">×</button>${type==='image'?`<img src="${data}">`:`<audio controls src="${data}"></audio>`}</div>`;
}

function clearPending() { pendingData = null; document.getElementById('pending-media').style.display = 'none'; }

function saveEverything() { 
    const i = document.getElementById('t-in');
    if(!i.value && !pendingData) return; 
    pulse(15); const v = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]'); 
    v.push({ 
        id: Date.now(), orbit: currentOrbit, 
        text: i.value || (pendingData ? `${pendingData.type.toUpperCase()} SIGNAL` : ""),
        type: pendingData ? pendingData.type : 'text', data: pendingData ? pendingData.data : null
    }); 
    localStorage.setItem('pb_v12_vault', JSON.stringify(v)); i.value = ''; clearPending(); renderV(); 
}

/* --- ORBITAL ENGINE --- */
function updateShiftTimes() { localStorage.setItem('pb_shift_start', document.getElementById('work-start').value); localStorage.setItem('pb_shift_end', document.getElementById('work-end').value); pulse(10); }
function loadShiftTimes() { document.getElementById('work-start').value = localStorage.getItem('pb_shift_start') || "09:00"; document.getElementById('work-end').value = localStorage.getItem('pb_shift_end') || "17:00"; }
function startShiftClock() { clearInterval(shiftInterval); shiftInterval = setInterval(calculateShift, 1000); }
function calculateShift() {
    const s = localStorage.getItem('pb_shift_start'), e = localStorage.getItem('pb_shift_end');
    if (!s || !e) return;
    const n = new Date(), st = new Date(n.toDateString() + ' ' + s), et = new Date(n.toDateString() + ' ' + e);
    if (n >= st && n <= et) {
        if (currentOrbit !== 'inner') setOrbit('inner');
        document.getElementById('shift-hud').style.display = 'block';
        const p = Math.min(100, Math.max(0, ((n - st) / (et - st)) * 100));
        document.getElementById('shift-bar').style.width = p + '%';
        document.getElementById('shift-percent').innerText = Math.floor(p) + '%';
        document.getElementById('shift-start-label').innerText = s; document.getElementById('shift-end-label').innerText = e;
    } else { document.getElementById('shift-hud').style.display = 'none'; }
}

/* --- WHITEBOARD --- */
function addNote(data = null) {
    const n = document.createElement('div'); n.className = `note ${data?.type === 'image' ? 'note-img' : ''}`;
    n.style.left = data ? data.x : (Math.abs(px) + 100) + 'px'; n.style.top = data ? data.y : (Math.abs(py) + 100) + 'px';
    n.style.width = data?.w || '200px'; n.style.height = data?.h || 'auto'; n.style.zIndex = ++topZ;
    n.innerHTML = data?.type === 'image' ? `<img src="${data.src}">` : `<div style="width:100%;height:100%;outline:none;overflow:hidden;" contenteditable="true" oninput="saveNotes()">${data ? data.text : 'New Shard'}</div>`;
    const d = document.createElement('div'); d.className = 'del-shard'; d.innerText = '×'; d.onclick = (e) => { e.stopPropagation(); n.remove(); saveNotes(); };
    const h = document.createElement('div'); h.className = 'resize-handle'; n.appendChild(d); n.appendChild(h);
    document.getElementById('wb-canvas').appendChild(n); setupShardInteractions(n, h);
}
function setupShardInteractions(n, h) {
    let ir = false; h.onmousedown = h.ontouchstart = (e) => { ir = true; e.stopPropagation(); e.preventDefault(); };
    n.onmousedown = n.ontouchstart = (e) => { n.style.zIndex = ++topZ; if (ir || e.target.className === 'del-shard') return; let sx = (e.pageX || e.touches[0].pageX) - n.offsetLeft, sy = (e.pageY || e.touches[0].pageY) - n.offsetTop; const m = (me) => { n.style.left = ((me.pageX || me.touches[0].pageX) - sx) + 'px'; n.style.top = ((me.pageY || me.touches[0].pageY) - sy) + 'px'; }; const u = () => { document.removeEventListener('mousemove', m); document.removeEventListener('mouseup', u); document.removeEventListener('touchmove', m); document.removeEventListener('touchend', u); saveNotes(); }; document.addEventListener('mousemove', m); document.addEventListener('mouseup', u); document.addEventListener('touchmove', m, {passive:false}); document.addEventListener('touchend', u); };
    const rm = (e) => { if (!ir) return; let nw = (e.pageX || e.touches[0].pageX) - n.getBoundingClientRect().left, nh = (e.pageY || e.touches[0].pageY) - n.getBoundingClientRect().top; if (nw > 80) n.style.width = nw + 'px'; if (nh > 40) n.style.height = nh + 'px'; };
    const ru = () => { ir = false; saveNotes(); }; document.addEventListener('mousemove', rm); document.addEventListener('mouseup', ru); document.addEventListener('touchmove', rm, {passive:false}); document.addEventListener('touchend', ru);
}
function addVisualShard() { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = e => { if(!e.target.files[0]) return; const r = new FileReader(); r.onload = ev => { addNote({ type: 'image', src: ev.target.result, w: '200px' }); saveNotes(); }; r.readAsDataURL(e.target.files[0]); }; i.click(); }
function saveNotes() { const ns = []; document.querySelectorAll('.note').forEach(n => { const is = n.classList.contains('note-img'); ns.push({ x: n.style.left, y: n.style.top, w: n.style.width, h: n.style.height, type: is ? 'image' : 'text', src: is ? n.querySelector('img').src : null, text: is ? null : n.innerText.replace('×', '') }); }); localStorage.setItem('pb_notes', JSON.stringify(ns)); }
function loadNotes() { const ns = JSON.parse(localStorage.getItem('pb_notes') || '[]'); ns.forEach(n => addNote(n)); }
function updateCanvas() { document.getElementById('wb-canvas').style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`; }
function initCanvas() { const c = document.getElementById('wb-page'); let d, sx, sy; c.ontouchstart = e => { if(e.target.closest('.note')) return; if(e.touches.length === 1) { sx=e.touches[0].clientX-px; sy=e.touches[0].clientY-py; } else if(e.touches.length === 2) d=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); }; c.ontouchmove = e => { if(e.target.closest('.note')) return; if(e.touches.length === 1 && !d) { px=e.touches[0].clientX-sx; py=e.touches[0].clientY-sy; } else if(e.touches.length === 2) { const nd=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); scale*=(nd/d); scale=Math.min(Math.max(0.3, scale), 2); d=nd; } updateCanvas(); }; c.ontouchend = () => d=null; }

/* --- ARCHIVE & TASKS --- */
function renderV() {
    const list = document.getElementById('v-list'), data = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]');
    const filtered = data.filter(i => i.orbit === currentOrbit).reverse();
    list.innerHTML = filtered.map(i => `<div class="swipe-container"><div class="del-hint">PURGE</div><div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${i.id}, 'vault')" style="border-left-color:var(--orbit-${currentOrbit})"><p style="margin:0; font-size:0.9rem;">${i.text}</p>${i.type === 'audio' ? `<audio controls src="${i.data}"></audio>` : ''}${i.type === 'image' ? `<img src="${i.data}" style="width:100%; border-radius:8px; margin-top:10px;">` : ''}</div></div>`).join('');
}
function renderTasks() { const l = document.getElementById('active-list'), t = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]'); l.innerHTML = t.filter(x => x.orbit === currentOrbit).map(x => `<div class="swipe-container"><div class="del-hint">PURGE</div><div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${x.id}, 'task')" style="border-left-color:var(--orbit-${currentOrbit})"><span>${x.name}</span></div></div>`).join(''); }
function addTask() { const i = document.getElementById('t-input'); if(!i.value) return; const t = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]'); t.push({ id: Date.now(), name: i.value, orbit: currentOrbit }); localStorage.setItem('pb_v12_tasks', JSON.stringify(t)); i.value = ''; renderTasks(); }
function deleteTask(id) { let t = JSON.parse(localStorage.getItem('pb_v12_tasks')); localStorage.setItem('pb_v12_tasks', JSON.stringify(t.filter(i => i.id !== id))); renderTasks(); }
function deleteVaultEntry(id) { let d = JSON.parse(localStorage.getItem('pb_v12_vault')); localStorage.setItem('pb_v12_vault', JSON.stringify(d.filter(i => i.id !== id))); renderV(); }

/* --- SYSTEM --- */
function ts(e) { tStartX = e.touches[0].clientX; currentEl = e.currentTarget; currentEl.style.transition = 'none'; }
function tm(e) { if(!currentEl) return; let x = e.touches[0].clientX - tStartX; if(x < 0) currentEl.style.transform = `translate3d(${x}px,0,0)`; }
function te(e, id, type) { if(!currentEl) return; let x = e.changedTouches[0].clientX - tStartX; currentEl.style.transition = 'transform 0.2s ease-out'; if(x < -120) { currentEl.style.transform = 'translate3d(-100%,0,0)'; setTimeout(() => { if(type==='task') deleteTask(id); else deleteVaultEntry(id); }, 150); } else currentEl.style.transform = 'translate3d(0,0,0)'; currentEl = null; }
function toggleLexicon() { pulse(10); const h = document.getElementById('lex-hud'); h.style.display = (h.style.display==='flex'?'none':'flex'); }
function wipe() { if(confirm("Clear local memory?")) { localStorage.clear(); location.reload(); } }