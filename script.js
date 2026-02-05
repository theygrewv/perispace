let currentOrbit = 'inner', tStartX=0, currentEl=null, px=0, py=0, scale=1, topZ=100;
let mediaRecorder, audioChunks = [], pendingData = null;

function boot() {
    setOrbit(localStorage.getItem('pb_orbit') || 'inner');
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

/* --- CAPTURE ENGINES --- */
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const reader = new FileReader();
            reader.readAsDataURL(new Blob(audioChunks)); 
            reader.onloadend = () => saveSignal(reader.result, 'audio');
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start(); pulse(50);
        document.getElementById('audio-hud').style.display = 'flex';
    } catch (err) { alert("Mic Denied."); }
}

function stopRecording() { if (mediaRecorder?.state !== "inactive") { mediaRecorder.stop(); document.getElementById('audio-hud').style.display = 'none'; pulse(20); } }

function captureImage() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment';
    i.onchange = e => {
        const r = new FileReader();
        r.onload = ev => saveSignal(ev.target.result, 'image');
        r.readAsDataURL(e.target.files[0]);
    }; i.click();
}

/* --- PENDING MEDIA TRAY --- */
function saveSignal(data, type) {
    pulse(30);
    pendingData = { data, type };
    const tray = document.getElementById('pending-media');
    tray.style.display = 'block';
    if (type === 'image') {
        tray.innerHTML = `<div class="pending-shard"><button class="remove-pending" onclick="clearPending()">×</button><img src="${data}"></div>`;
    } else if (type === 'audio') {
        tray.innerHTML = `<div class="pending-shard"><button class="remove-pending" onclick="clearPending()">×</button><audio controls src="${data}" style="width:100%; filter:invert(1); height:30px;"></audio></div>`;
    }
}

function clearPending() {
    pendingData = null;
    document.getElementById('pending-media').style.display = 'none';
    document.getElementById('pending-media').innerHTML = '';
}

/* --- FINAL SYNC --- */
function saveEverything() { 
    const i = document.getElementById('t-in');
    if(!i.value && !pendingData) return; 
    pulse(15); const v = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]'); 
    v.push({ 
        id: Date.now(), 
        orbit: currentOrbit, 
        text: i.value || (pendingData ? `${pendingData.type.toUpperCase()} SIGNAL` : "EMPTY"),
        type: pendingData ? pendingData.type : 'text',
        data: pendingData ? pendingData.data : null
    }); 
    localStorage.setItem('pb_v12_vault', JSON.stringify(v)); 
    i.value = ''; clearPending(); renderV(); 
}

/* --- VAULT RENDERER --- */
function renderV() {
    const list = document.getElementById('v-list'), data = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]');
    const filtered = data.filter(i => i.orbit === currentOrbit).reverse();
    if (filtered.length === 0) { list.innerHTML = `<div style="opacity:0.2; text-align:center; margin-top:40px;">SECTOR EMPTY</div>`; return; }
    list.innerHTML = filtered.map(i => `
        <div class="swipe-container"><div class="del-hint">PURGE</div><div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${i.id}, 'vault')" style="border-left-color:var(--orbit-${currentOrbit})">
            <p style="margin:0; font-size:0.9rem; line-height:1.4;">${i.text}</p>
            ${i.type === 'audio' ? `<audio controls src="${i.data}" style="width:100%;"></audio>` : ''}
            ${i.type === 'image' ? `<img src="${i.data}" style="width:100%; border-radius:8px; margin-top:15px; border:1px solid #333;">` : ''}
        </div></div>`).join('');
}

/* --- WHITEBOARD --- */
function addNote(data = null) {
    const n = document.createElement('div');
    n.className = `note ${data?.type === 'image' ? 'note-img' : ''}`;
    n.style.left = data ? data.x : (Math.abs(px) + 100) + 'px';
    n.style.top = data ? data.y : (Math.abs(py) + 100) + 'px';
    n.style.width = data?.w || '200px';
    n.style.height = data?.h || 'auto';
    n.style.zIndex = ++topZ;

    if (data?.type === 'image') {
        n.innerHTML = `<img src="${data.src}">`;
    } else {
        n.innerHTML = `<div class="note-text" contenteditable="true" style="width:100%;height:100%;outline:none;overflow:hidden;" oninput="saveNotes()">${data ? data.text : 'New Shard'}</div>`;
    }

    const del = document.createElement('div'); del.className = 'del-shard'; del.innerText = '×';
    del.onclick = (e) => { e.stopPropagation(); n.remove(); saveNotes(); pulse(20); };
    n.appendChild(del);

    const handle = document.createElement('div'); handle.className = 'resize-handle';
    n.appendChild(handle);

    document.getElementById('wb-canvas').appendChild(n);
    setupShardInteractions(n, handle);
}

function setupShardInteractions(n, handle) {
    let isResizing = false;
    handle.onmousedown = handle.ontouchstart = (e) => { isResizing = true; e.stopPropagation(); e.preventDefault(); };
    n.onmousedown = n.ontouchstart = (e) => {
        n.style.zIndex = ++topZ;
        if (isResizing || e.target.className === 'del-shard') return;
        let sx = (e.pageX || e.touches[0].pageX) - n.offsetLeft;
        let sy = (e.pageY || e.touches[0].pageY) - n.offsetTop;
        const move = (me) => {
            n.style.left = ((me.pageX || me.touches[0].pageX) - sx) + 'px';
            n.style.top = ((me.pageY || me.touches[0].pageY) - sy) + 'px';
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); saveNotes(); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); document.addEventListener('touchmove', move, {passive:false}); document.addEventListener('touchend', up);
    };
    const resizeMove = (e) => {
        if (!isResizing) return;
        let nw = (e.pageX || e.touches[0].pageX) - n.getBoundingClientRect().left;
        let nh = (e.pageY || e.touches[0].pageY) - n.getBoundingClientRect().top;
        if (nw > 80) n.style.width = nw + 'px'; if (nh > 40) n.style.height = nh + 'px';
    };
    const resizeUp = () => { isResizing = false; saveNotes(); };
    document.addEventListener('mousemove', resizeMove); document.addEventListener('mouseup', resizeUp); document.addEventListener('touchmove', resizeMove, {passive:false}); document.addEventListener('touchend', resizeUp);
}

function addVisualShard() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = e => {
        const r = new FileReader();
        r.onload = ev => { addNote({ type: 'image', src: ev.target.result, w: '200px', h: 'auto' }); saveNotes(); };
        r.readAsDataURL(e.target.files[0]);
    }; i.click();
}

function saveNotes() {
    const ns = [];
    document.querySelectorAll('.note').forEach(n => {
        const isImg = n.classList.contains('note-img');
        ns.push({ x: n.style.left, y: n.style.top, w: n.style.width, h: n.style.height, type: isImg ? 'image' : 'text', src: isImg ? n.querySelector('img').src : null, text: isImg ? null : n.innerText.replace('×', '') });
    });
    localStorage.setItem('pb_notes', JSON.stringify(ns));
}

function loadNotes() { const ns = JSON.parse(localStorage.getItem('pb_notes') || '[]'); ns.forEach(n => addNote(n)); }

/* --- SHARED --- */
function ts(e) { tStartX = e.touches[0].clientX; currentEl = e.currentTarget; currentEl.style.transition = 'none'; }
function tm(e) { if(!currentEl) return; let x = e.touches[0].clientX - tStartX; if(x < 0) currentEl.style.transform = `translate3d(${x}px,0,0)`; }
function te(e, id, type) {
    if(!currentEl) return; let x = e.changedTouches[0].clientX - tStartX;
    currentEl.style.transition = 'transform 0.2s ease-out';
    if(x < -120) { currentEl.style.transform = 'translate3d(-100%,0,0)'; pulse(25); setTimeout(() => { if(type==='task') deleteTask(id); else deleteVaultEntry(id); }, 150); } 
    else currentEl.style.transform = 'translate3d(0,0,0)';
    currentEl = null;
}
function addTask() { 
    const i = document.getElementById('t-input'); if(!i.value) return; pulse(10); 
    const t = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]'); 
    t.push({ id: Date.now(), name: i.value, orbit: currentOrbit }); 
    localStorage.setItem('pb_v12_tasks', JSON.stringify(t)); i.value = ''; renderTasks(); 
}
function renderTasks() { 
    const l = document.getElementById('active-list'), t = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]'); 
    l.innerHTML = t.filter(x => x.orbit === currentOrbit).map(x => `<div class="swipe-container"><div class="del-hint">PURGE</div><div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${x.id}, 'task')" style="border-left-color:var(--orbit-${currentOrbit})"><span>${x.name}</span></div></div>`).join(''); 
}
function deleteTask(id) { let t = JSON.parse(localStorage.getItem('pb_v12_tasks')); localStorage.setItem('pb_v12_tasks', JSON.stringify(t.filter(i => i.id !== id))); renderTasks(); }
function deleteVaultEntry(id) { let d = JSON.parse(localStorage.getItem('pb_v12_vault')); localStorage.setItem('pb_v12_vault', JSON.stringify(d.filter(i => i.id !== id))); renderV(); }
function updateCanvas() { document.getElementById('wb-canvas').style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`; }
function initCanvas() {
    const c = document.getElementById('wb-page'); let d, sx, sy;
    c.ontouchstart = e => { if(e.target.closest('.note')) return; if(e.touches.length === 1) { sx=e.touches[0].clientX-px; sy=e.touches[0].clientY-py; } else if(e.touches.length === 2) d=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); };
    c.ontouchmove = e => { if(e.target.closest('.note')) return; if(e.touches.length === 1 && !d) { px=e.touches[0].clientX-sx; py=e.touches[0].clientY-sy; } else if(e.touches.length === 2) { const nd=Math.hypot(e.touches[0].pageX-e.touches[1].pageX, e.touches[0].pageY-e.touches[1].pageY); scale*=(nd/d); scale=Math.min(Math.max(0.3, scale), 2); d=nd; } updateCanvas(); };
    c.ontouchend = () => d=null;
}
function toggleLexicon() { pulse(10); const h = document.getElementById('lex-hud'); h.style.display = (h.style.display==='flex'?'none':'flex'); }
function wipe() { if(confirm("Wipe all locally stored context?")) { localStorage.clear(); location.reload(); } }
function exportBrain() { const data = { vault: localStorage.getItem('pb_v12_vault'), tasks: localStorage.getItem('pb_v12_tasks'), notes: localStorage.getItem('pb_notes') }; const blob = new Blob([JSON.stringify(data)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `perispace_backup.json`; a.click(); }
function importBrain(input) { const reader = new FileReader(); reader.onload = function() { const d = JSON.parse(reader.result); if(d.vault) localStorage.setItem('pb_v12_vault', d.vault); if(d.tasks) localStorage.setItem('pb_v12_tasks', d.tasks); if(d.notes) localStorage.setItem('pb_notes', d.notes); location.reload(); }; reader.readAsText(input.files[0]); }