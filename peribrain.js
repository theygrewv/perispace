// --- Vault Persistence ---
const vault = document.getElementById('vault-input');
vault.value = localStorage.getItem('perispace_vault') || '';
vault.addEventListener('input', () => {
    localStorage.setItem('perispace_vault', vault.value);
});

// --- Timer Logic with Audio ---
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

// --- Task List ---
function addTask() {
    const input = document.getElementById('new-task');
    if (!input.value.trim()) return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span> <button onclick="this.parentElement.remove()">X</button>`;
    document.getElementById('task-list').appendChild(li);
    input.value = '';
}