// --- 1. PERSISTENCE (Vault) ---
const vault = document.getElementById('vault-input');
vault.value = localStorage.getItem('perispace_vault') || '';
vault.addEventListener('input', () => {
    localStorage.setItem('perispace_vault', vault.value);
});

// --- 2. BRAIN INTERVALS (Timer & Audio) ---
let countdown;
function startTimer(minutes, label) {
    clearInterval(countdown);
    const display = document.getElementById('timer-display');
    const alertSound = document.getElementById('alert-sound');
    let secondsLeft = minutes * 60;

    countdown = setInterval(() => {
        secondsLeft--;
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        display.innerText = `${label}: ${mins}:${secs < 10 ? '0' : ''}${secs}`;

        if (secondsLeft <= 0) {
            clearInterval(countdown);
            display.innerText = "Time's up!";
            alertSound.play().catch(() => {}); 
            alert(`${label} is over.`);
        }
    }, 1000);
}

// --- 3. TASK MANAGER ---
function addTask() {
    const input = document.getElementById('new-task');
    if (!input.value.trim()) return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span> <button onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('task-list').appendChild(li);
    input.value = '';
}

// --- 4. INFINITE CANVAS ---
const canvas = document.getElementById('infinite-canvas');
const ctx = canvas.getContext('2d');
let drawing = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00adb5';
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
});