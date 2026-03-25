/* =========================
VOICE DISTRESS DETECTION SYSTEM (CLEAN VERSION)
========================= */

let recorder;
let audioChunks = [];
let monitoring = false;

/* =========================
START MONITORING
========================= */

async function startMonitoring() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        recorder = new MediaRecorder(stream);
        monitoring = true;

        recorder.ondataavailable = e => {
            audioChunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: "audio/wav" });
            audioChunks = [];

            sendAudioToAI(blob);

            if (monitoring) {
                setTimeout(() => recorder.start(), 1000);
                setTimeout(() => recorder.stop(), 5000);
            }
        };

        recorder.start();
        setTimeout(() => recorder.stop(), 5000);

        toast("🎤", "AI Voice Monitoring Started");

    } catch (err) {
        console.error("Mic access error:", err);
        toast("❌", "Microphone access denied");
    }
}

/* =========================
STOP MONITORING
========================= */

function stopMonitoring() {
    monitoring = false;

    if (recorder && recorder.state !== "inactive") {
        recorder.stop();
    }

    toast("🛑", "Monitoring Stopped");
}

/* =========================
SEND AUDIO TO BACKEND AI
========================= */

function sendAudioToAI(audioBlob) {

    const formData = new FormData();
    formData.append("audio", audioBlob);

    fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {

        console.log("AI RESULT:", data);

        if (data.result === "Distress Detected") {
            triggerSOS();
        } else {
            toast("✅", "No distress detected");
        }

    })
    .catch(err => {
        console.error(err);
        toast("❌", "Server error");
    });
}

/* =========================
SOS SYSTEM
========================= */

function triggerSOS() {

    toast("🚨", "Distress detected!");

    playAlarm();
    sendSMS();
    shareLocation();
}

/* =========================
SEND SMS (BACKEND)
========================= */

function sendSMS() {
    fetch("http://127.0.0.1:8000/send-sms", {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => console.log("SMS Sent:", data))
    .catch(err => console.error(err));
}

/* =========================
LOCATION SHARE
========================= */

function shareLocation() {

    if (!navigator.geolocation) {
        toast("❌", "Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(function (pos) {

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const mapUrl = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;

        const mapDiv = document.getElementById("map");
        if (mapDiv) {
            mapDiv.innerHTML =
                `<iframe width="100%" height="300" src="${mapUrl}"></iframe>`;
        }

        fetch("http://127.0.0.1:8000/location", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ lat: lat, lon: lon })
        });

    });
}

/* =========================
ALARM SOUND
========================= */

function playAlarm() {
    let alarm = new Audio("https://www.soundjay.com/misc/sounds/siren-01.mp3");
    alarm.play();
}