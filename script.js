// Updated for multi-device stability (Pixel 9 + FydeOS)
let currentOrbit = 'inner', tStartX=0, currentEl=null, px=0, py=0, scale=1;
 currentEl=null, px=-1500, py=-1500, scale=1;

/** * 1. SYSTEM INITIALIZATION 
 */
function boot() {
    // Load last known orbit or default to Inner
    setOrbit(localStorage.getItem('pb_orbit') || 'inner');
    
    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(() => console.log("Orbit Stable."));
    }
    
    // Initialize UI
    renderTasks();
    renderV();
    loadNotes();
    initCanvas();
    updateCanvas();
}

/** * 2. TACTILE ENGINE (Haptics & Navigation)
 */
function pulse(ms=10) { if("vibrate" in navigator) navigator.vibrate(ms); }

function go(id, btn) {
    pulse(7);
    // Hide all pages
    document.querySelectorAll('.page, #wb-page').forEach(p => p.style.display = 'none');
    // Deactivate nav buttons
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) {
        // Space uses block for the canvas, others use Flex for layout
        target.style.display = (id === 'wb-page' ? 'block' : 'flex');
    }
    btn.classList.add('active');
}

function setOrbit(o) {
    pulse(15);
    currentOrbit = o;
    localStorage.setItem('pb_orbit', o);
    
    // Update Orbit HUD
    document.querySelectorAll('.orbit-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${o}`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Refresh Data
    renderTasks();
    renderV();
}

/** * 3. UNIVERSAL SWIPE-TO-PURGE ENGINE
 */
function ts(e) { 
    tStartX = e.touches[0].clientX; 
    currentEl = e.currentTarget; 
    currentEl.style.transition = 'none'; 
}

function tm(e) { 
    if(!currentEl) return;
    let x = e.touches[0].clientX - tStartX;
    if(x < 0) { // Only swipe left
        currentEl.style.transform = `translate3d(${x}px,0,0)`;
        if(x < -100) pulse(5); // Warning vibration
    }
}

function te(e, id, type) {
    if(!currentEl) return;
    let x = e.changedTouches[0].clientX - tStartX;
    currentEl.style.transition = 'transform 0.2s ease-out';
    
    if(x < -120) { // Threshold for deletion
        currentEl.style.transform = 'translate3d(-100%,0,0)';
        pulse(25); // Thump feedback
        setTimeout(() => { 
            if(type === 'task') deleteTask(id); 
            else deleteVault(id); 
        }, 150);
    } else {
        currentEl.style.transform = 'translate3d(0,0,0)';
    }
    currentEl = null;
}

/** * 4. MISSION & VAULT LOGIC
 */
function saveEverything() {
    const input = document.getElementById('t-in');
    if(!input.value) return;
    pulse(15);
    const v = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]');
    v.push({ id: Date.now(), orbit: currentOrbit, text: input.value });
    localStorage.setItem('pb_v12_vault', JSON.stringify(v));
    input.value = '';
    renderV();
}

function renderV() {
    const list = document.getElementById('v-list');
    const data = JSON.parse(localStorage.getItem('pb_v12_vault') || '[]');
    list.innerHTML = data.filter(i => i.orbit === currentOrbit).reverse().map(i => `
        <div class="swipe-container">
            <div class="del-hint">PURGE</div>
            <div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${i.id}, 'vault')" style="border-left-color:var(--orbit-${currentOrbit})">
                <p>${i.text}</p>
            </div>
        </div>`).join('');
}

function deleteVault(id) {
    let d = JSON.parse(localStorage.getItem('pb_v12_vault'));
    localStorage.setItem('pb_v12_vault', JSON.stringify(d.filter(i => i.id !== id)));
    renderV();
}

function addTask() {
    const input = document.getElementById('t-input');
    if(!input.value) return;
    pulse(10);
    const t = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]');
    t.push({ id: Date.now(), name: input.value, orbit: currentOrbit });
    localStorage.setItem('pb_v12_tasks', JSON.stringify(t));
    input.value = '';
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById('active-list');
    const tasks = JSON.parse(localStorage.getItem('pb_v12_tasks') || '[]');
    list.innerHTML = tasks.filter(x => x.orbit === currentOrbit).map(x => `
        <div class="swipe-container">
            <div class="del-hint">PURGE</div>
            <div class="card" ontouchstart="ts(event)" ontouchmove="tm(event)" ontouchend="te(event, ${x.id}, 'task')" style="border-left-color:var(--orbit-${currentOrbit})">
                <span>${x.name}</span>
            </div>
        </div>`).join('');
}

function deleteTask(id) {
    let t = JSON.parse(localStorage.getItem('pb_v12_tasks'));
    localStorage.setItem('pb_v12_tasks', JSON.stringify(t.filter(i => i.id !== id)));
    renderTasks();
}

/** * 5. INFINITE SPACE (Whiteboard)
 */
function addNote(d=null) {
    pulse(10);
    const n = document.createElement('div');
    n.className = 'note';
    n.style.left = d ? d.x : '500px';
    n.style.top = d ? d.y : '500px';
    n.innerHTML = `<div contenteditable="true" oninput="saveNotes()">${d ? d.text : 'Shard'}</div>`;
    document.getElementById('wb-canvas').appendChild(n);
    n.ontouchstart = e => { e.stopPropagation(); };
}

function saveNotes() {
    const notes = [];
    document.querySelectorAll('.note').forEach(n => {
        notes.push({ x: n.style.left, y: n.style.top, text: n.innerText });
    });
    localStorage.setItem('pb_notes', JSON.stringify(notes));
}

function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('pb_notes') || '[]');
    notes.forEach(n => addNote(n));
}

function updateCanvas() {
    document.getElementById('wb-canvas').style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`;
}

function initCanvas() {
    const c = document.getElementById('wb-page');
    let d, sx, sy;
    c.ontouchstart = e => {
        if(e.target.closest('.note')) return;
        if(e.touches.length === 1) {
            sx = e.touches[0].clientX - px;
            sy = e.touches[0].clientY - py;
        } else if(e.touches.length === 2) {
            d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        }
    };
    c.ontouchmove = e => {
        if(e.target.closest('.note')) return;
        if(e.touches.length === 1 && !d) {
            px = e.touches[0].clientX - sx;
            py = e.touches[0].clientY - sy;
        } else if(e.touches.length === 2) {
            const nd = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            scale *= (nd / d);
            scale = Math.min(Math.max(0.3, scale), 2);
            d = nd;
        }
        updateCanvas();
    };
    c.ontouchend = () => d = null;
}

/** * 6. MEDIA & SYSTEM
 */
function triggerMedia(m=null) {
    pulse(15);
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = 'image/*';
    if(m) i.capture = m;
    i.click();
}

function wipe() {
    if(confirm("Erase all local context? This cannot be undone.")) {
        localStorage.clear();
        location.reload();
    }
}
