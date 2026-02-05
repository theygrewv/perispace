// --- Vault Persistence ---
const vault = document.getElementById('vault-input');
vault.value = localStorage.getItem('perispace_vault') || '';
vault.addEventListener('input', () => {
    localStorage.setItem('perispace_vault', vault.value);
});

// --- Audio Hub Logic ---
let mediaRecorder;
let audioChunks = [];
const recordBtn = document.getElementById('record-btn');
const audioPreview = document.getElementById('audio-preview');
const saveAudioBtn = document.getElementById('save-audio-btn');

recordBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPreview.src = audioUrl;
            audioPreview.style.display = "block";
            saveAudioBtn.style.display = "inline-block";
        };

        mediaRecorder.start();
        recordBtn.innerText = "Stop Recording...";
        recordBtn.style.background = "#ff4b2b"; // Red for recording
    } else {
        mediaRecorder.stop();
        recordBtn.innerText = "Record Memo";
        recordBtn.style.background = "#00adb5";
    }
});

saveAudioBtn.addEventListener('click', () => {
    const timestamp = new Date().toLocaleString();
    const memoEntry = `\n[Audio Memo Saved: ${timestamp}]\n---\n`;
    vault.value += memoEntry;
    localStorage.setItem('perispace_vault', vault.value);
    
    // Reset audio hub state
    saveAudioBtn.style.display = "none";
    alert("Audio reference added to Vault text.");
});

// --- Task List & Timer (Previous Logic Kept) ---
function addTask() {
    const input = document.getElementById('new-task');
    if (!input.value.trim()) return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span> <button onclick="this.parentElement.remove()">X</button>`;
    document.getElementById('task-list').appendChild(li);
    input.value = '';
}

let countdown;
function startTimer(minutes, label) {
    clearInterval(countdown);
    const display = document.getElementById('timer-display');
    const alertSound = document.getElementById('alert-sound');
    let secondsLeft = minutes * 60;
    countdown = setInterval(() => {
        secondsLeft--;
        let m = Math.floor(secondsLeft / 60);
        let s = secondsLeft % 60;
        display.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (secondsLeft <= 0) {
            clearInterval(countdown);
            display.innerText = "Done!";
            alertSound.play().catch(() => {});
            alert(`${label} complete!`);
        }
    }, 1000);
}