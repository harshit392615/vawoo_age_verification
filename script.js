// Wait for face-api.js to be loaded
let faceAPILoaded = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

function waitForFaceAPI() {
    return new Promise((resolve, reject) => {
        const checkFaceAPI = () => {
            if (typeof faceapi !== 'undefined') {
                faceAPILoaded = true;
                resolve();
            } else if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                initializationAttempts++;
                setTimeout(checkFaceAPI, 1000);
            } else {
                reject(new Error('Failed to load face-api.js after multiple attempts'));
            }
        };
        checkFaceAPI();
    });
}

// Face detection code
let stream = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startCamera');
const captureButton = document.getElementById('capture');
const ageResult = document.getElementById('ageResult');
const loadingElement = document.getElementById('loading');
const verificationOverlay = document.getElementById('verificationOverlay');

function showLoading(message) {
    loadingElement.textContent = message;
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

function showError(message) {
    ageResult.textContent = message;
    ageResult.style.color = 'red';
}

function showSuccess(message) {
    ageResult.textContent = message;
    ageResult.style.color = 'green';
}

async function loadModels() {
    try {
        showLoading('Loading face detection models...');
        
        // Wait for face-api.js to be loaded
        await waitForFaceAPI();
        
        // Try different paths for the models
        const modelPaths = [
            './models',
            'models',
            '/models'
        ];

        let modelsLoaded = false;
        let lastError = null;

        for (const path of modelPaths) {
            try {
                console.log(`Attempting to load models from: ${path}`);
                await faceapi.nets.tinyFaceDetector.loadFromUri(path);
                await faceapi.nets.ageGenderNet.loadFromUri(path);
                modelsLoaded = true;
                console.log(`Successfully loaded models from: ${path}`);
                break;
            } catch (error) {
                console.error(`Failed to load from ${path}:`, error);
                lastError = error;
            }
        }

        if (!modelsLoaded) {
            throw new Error(`Failed to load models from any path. Last error: ${lastError?.message}`);
        }

        hideLoading();
        startButton.disabled = false;
        showSuccess('Models loaded successfully. Click "Start Camera" to begin.');
    } catch (error) {
        showError('Error loading models. Please refresh the page.');
        console.error('Error loading models:', error);
    }
}

startButton.addEventListener('click', async () => {
    try {
        showLoading('Starting camera...');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.style.display = 'block';
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        hideLoading();
        startButton.disabled = true;
        captureButton.disabled = false;
        showSuccess('Camera started. Click "Capture & Verify Age" to continue.');
    } catch (error) {
        showError('Error accessing camera. Please make sure you have granted camera permissions.');
        console.error('Error accessing camera:', error);
    }
});

captureButton.addEventListener('click', async () => {
    try {
        showLoading('Analyzing face...');
        captureButton.disabled = true;

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const detections = await faceapi.detectSingleFace(
            canvas,
            new faceapi.TinyFaceDetectorOptions()
        ).withAgeAndGender();

        if (!detections) {
            throw new Error('No face detected. Please make sure your face is clearly visible.');
        }

        const age = Math.round(detections.age);
        
        if (age >= 18) {
            localStorage.setItem('ageVerified', 'true');
            localStorage.setItem('detectedAge', age);
            showSuccess(`Age detected: ${age}. Access granted!`);
            setTimeout(() => {
                verificationOverlay.style.display = 'none';
            }, 2000);
        } else {
            showError(`Age detected: ${age}. Access denied. You must be 18 or older.`);
        }
    } catch (error) {
        showError(`Error: ${error.message}. Please try again.`);
        console.error('Error analyzing face:', error);
    } finally {
        hideLoading();
        captureButton.disabled = false;
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Force verification overlay to be visible
    verificationOverlay.style.display = 'flex';
    
    // Clear any existing verification status
    localStorage.removeItem('ageVerified');
    
    // Start loading models
    loadModels();
}); 