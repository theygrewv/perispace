document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const vault = document.getElementById('vault-input');
    const header = document.getElementById('main-header');
    const previewZone = document.getElementById('capture-preview-zone');
    const audioList = document.getElementById('audio-list');
    
    // Media Controls
    const camBtn = document.getElementById('camera-btn');
    const shutterBtn = document.getElementById('shutter-btn');
    const recordBtn = document.getElementById('record-btn');
    const picker = document.getElementById('media-picker');
    const commitBtn = document.getElementById('commit-btn');
    
    // Preview Elements
    const video = document.getElementById('camera-stream');
    const imgPrev = document.getElementById('image-preview');
    const audPrev = document.getElementById('audio-preview');
    const captionInput = document.getElementById('media-caption');

    let currentData = null;
    let currentType = null;
    let mediaRecorder;
    let chunks = [];

    // Load Text Vault
    vault.value = localStorage.getItem('perispace_vault') || '';
    vault.oninput = () => localStorage.setItem('perispace_vault', vault.value);

    // PULSE STATUS
    const setStatus = (on) => on ? header.classList.add('recording-active') : header.classList.remove('recording-active');

    // CAMERA LOGIC
    camBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.style.display = "block";
            shutterBtn.style.display = "block";
            previewZone.style.display = "block";
            window.camStream = stream;
            setStatus(true);
        } catch (e) { alert("Camera Error: " + e); }
    });

    shutterBtn.addEventListener('click', () => {
        const canvas = document.getElementById('photo-cap');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        currentData = canvas.toDataURL('image/png');
        currentType = 'image';
        
        window.camStream.getTracks().forEach(t => t.stop());
        video.style.display = "none";
        shutterBtn.style.display = "none";
        imgPrev.src = currentData;
        imgPrev.style.display = "block";
        setStatus(false);
    });

    // AUDIO LOGIC
    recordBtn.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            chunks = [];
            setStatus(true);
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    currentData = reader.result;
                    currentType = 'audio';
                    previewZone.style.display = "block";
                    audPrev.src = currentData;
                    audPrev.style.display = "block";
                    setStatus(false);
                };
            };
            mediaRecorder.start();
            recordBtn.innerText = "Stop";
        } else {
            mediaRecorder.stop();
            recordBtn.innerText = "Mic";
        }
    });

    // FILE PICKER
    picker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentData = ev.target.result;
            currentType = file.type.includes('audio') ? 'audio' : 'image';
            previewZone.style.display = "block";
            if(currentType === 'image') { imgPrev.src = currentData; imgPrev.style.display="block"; }
            else { audPrev.src = currentData; audPrev.style.display="block"; }
        };
        reader.readAsDataURL(file);
    });

    // COMMIT TO VAULT
    commitBtn.addEventListener('click', () => {
        const time = new Date().toLocaleString();
        const text = captionInput.value || "Mission Log Entry";
        
        let stored = JSON.parse(localStorage.getItem('perispace_memos') || '[]');
        stored.push({ time, data: currentData, type: currentType, text });
        localStorage.setItem('perispace_memos', JSON.stringify(stored));
        
        render(time, currentData, currentType, text);
        previewZone.style.display = "none";
        captionInput.value = "";
    });

    function render(time, data, type, text) {
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.style = "border-left: 3px solid #00adb5; padding: 10px; margin-top: 10px; background: #0b0e14;";
        const media = type === 'audio' ? `<audio controls src="${data}" style="width:100%; filter:invert(1);"></audio>` : `<img src="${data}" style="width:100%; border-radius:5px;">`;
        div.innerHTML = `<small>${time}</small><p style="margin:5px 0;">${text}</p>${media}`;
        audioList.prepend(div);
    }

    // Load History
    JSON.parse(localStorage.getItem('perispace_memos') || '[]').forEach(m => render(m.time, m.data, m.type, m.text));
});

// GLOBAL FUNCTIONS FOR ONCLICK
function startTimer(min, label) {
    let sec = min * 60;
    const disp = document.getElementById('timer-display');
    const t = setInterval(() => {
        sec--;
        let m = Math.floor(sec / 60);
        let s = sec % 60;
        disp.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (sec <= 0) {
            clearInterval(t);
            document.getElementById('alert-sound').play();
            alert(label + " finished!");
        }
    }, 1000);
}

function addTask() {
    const inp = document.getElementById('new-task');
    if (!inp.value) return;
    const li = document.createElement('li');
    li.innerHTML = `${inp.value} <button onclick="this.parentElement.remove()" style="background:none; color:red; border:none; cursor:pointer;">X</button>`;
    document.getElementById('task-list').appendChild(li);
    inp.value = "";
}
