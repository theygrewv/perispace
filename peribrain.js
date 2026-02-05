// --- Vault & Audio Persistence ---
const vault = document.getElementById('vault-input');
const audioList = document.getElementById('audio-list');

// Load saved text
vault.value = localStorage.getItem('perispace_vault') || '';
vault.addEventListener('input', () => localStorage.setItem('perispace_vault', vault.value));

// Load saved audio files on startup
window.onload = loadSavedAudio;

let mediaRecorder;
let audioChunks = [];

// ... [Keep the recordBtn logic from previous version] ...

// Modified Save Logic
saveAudioBtn.addEventListener('click', () => {
    const reader = new FileReader();
    const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    
    reader.readAsDataURL(audioBlob); 
    reader.onloadend = () => {
        const base64Audio = reader.result;
        const timestamp = new Date().toLocaleString();
        
        // Save to LocalStorage
        let savedMemos = JSON.parse(localStorage.getItem('perispace_memos') || '[]');
        savedMemos.push({ time: timestamp, data: base64Audio });
        localStorage.setItem('perispace_memos', JSON.stringify(savedMemos));
        
        // Update UI
        createAudioPlayer(timestamp, base64Audio);
        
        // Add text breadcrumb
        vault.value += `\n[Audio Memo Saved: ${timestamp}]\n`;
        localStorage.setItem('perispace_vault', vault.value);
        
        saveAudioBtn.style.display = "none";
        audioPreview.style.display = "none";
    };
});

function createAudioPlayer(time, data) {
    const container = document.createElement('div');
    container.className = 'saved-audio-item';
    container.innerHTML = `
        <small>${time}</small><br>
        <audio controls src="${data}"></audio>
        <button onclick="deleteAudio('${time}')" class="btn-del">Delete</button>
    `;
    audioList.prepend(container); // Newest on top
}

function loadSavedAudio() {
    let savedMemos = JSON.parse(localStorage.getItem('perispace_memos') || '[]');
    savedMemos.forEach(memo => createAudioPlayer(memo.time, memo.data));
}

function deleteAudio(time) {
    let savedMemos = JSON.parse(localStorage.getItem('perispace_memos') || '[]');
    savedMemos = savedMemos.filter(m => m.time !== time);
    localStorage.setItem('perispace_memos', JSON.stringify(savedMemos));
    location.reload(); // Refresh UI
}

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