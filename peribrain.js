const vault = document.getElementById('vault-input');
const audioList = document.getElementById('audio-list');
const header = document.getElementById('main-header');
const previewZone = document.getElementById('capture-preview-zone');
const mediaCaption = document.getElementById('media-caption');
const commitBtn = document.getElementById('commit-btn');

let currentMediaData = null;
let currentMediaType = null;

// --- UTILITY: Pulse Status ---
function setStatus(active) {
    active ? header.classList.add('recording-active') : header.classList.remove('recording-active');
}

// --- CAMERA CAPTURE ---
const camBtn = document.getElementById('camera-btn');
const shutterBtn = document.getElementById('shutter-btn');
const video = document.getElementById('camera-stream');
const imgPreview = document.getElementById('image-preview');

camBtn.onclick = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = "block";
        previewZone.style.display = "block";
        shutterBtn.style.display = "block"; // Show the shutter now
        setStatus(true); // Pulse the status light
        
        // Save stream reference to stop it later
        window.localStream = stream;
    } catch (err) {
        alert("Camera access denied or not found.");
    }
};

shutterBtn.onclick = () => {
    const canvas = document.getElementById('photo-cap');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    currentMediaData = canvas.toDataURL('image/png');
    currentMediaType = 'image';
    
    // Stop the camera stream
    window.localStream.getTracks().forEach(track => track.stop());
    
    // Update UI
    video.style.display = "none";
    shutterBtn.style.display = "none";
    imgPreview.src = currentMediaData;
    imgPreview.style.display = "block";
    setStatus(false);
};
};

// --- FILE PICKER ---
document.getElementById('media-picker').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        currentMediaData = event.target.result;
        currentMediaType = file.type.includes('audio') ? 'audio' : 'image';
        previewZone.style.display = "block";
        if(currentMediaType === 'image') {
            document.getElementById('image-preview').src = currentMediaData;
            document.getElementById('image-preview').style.display = "block";
        }
    };
    reader.readAsDataURL(file);
};

// --- AUDIO RECORDING ---
let mediaRecorder;
let chunks = [];
document.getElementById('record-btn').onclick = async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        setStatus(true);
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/ogg' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                currentMediaData = reader.result;
                currentMediaType = 'audio';
                previewZone.style.display = "block";
                document.getElementById('audio-preview').src = currentMediaData;
                document.getElementById('audio-preview').style.display = "block";
            };
            setStatus(false);
        };
        mediaRecorder.start();
    } else { mediaRecorder.stop(); }
};

// --- COMMIT TO VAULT ---
commitBtn.onclick = () => {
    const time = new Date().toLocaleString();
    const caption = mediaCaption.value || "Mission Log";
    let memos = JSON.parse(localStorage.getItem('perispace_memos') || '[]');
    memos.push({ time, data: currentMediaData, type: currentMediaType, text: caption });
    localStorage.setItem('perispace_memos', JSON.stringify(memos));
    
    renderItem(time, currentMediaData, currentMediaType, caption);
    previewZone.style.display = "none";
    mediaCaption.value = "";
};

function renderItem(time, data, type, text) {
    const div = document.createElement('div');
    div.className = 'saved-item';
    const mediaHtml = type === 'audio' ? `<audio controls src="${data}"></audio>` : `<img src="${data}">`;
    div.innerHTML = `<small>${time}</small><p>${text}</p>${mediaHtml}`;
    audioList.prepend(div);
}

// (Load saved items on init)
JSON.parse(localStorage.getItem('perispace_memos') || '[]').forEach(m => renderItem(m.time, m.data, m.type, m.text));