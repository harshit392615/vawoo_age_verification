const https = require('https');
const fs = require('fs');
const path = require('path');

const models = [
    {
        name: 'tiny_face_detector_model-weights_manifest.json',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
    },
    {
        name: 'tiny_face_detector_model-shard1',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1'
    },
    {
        name: 'age_gender_model-weights_manifest.json',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/age_gender_model-weights_manifest.json'
    },
    {
        name: 'age_gender_model-shard1',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/age_gender_model-shard1'
    }
];

const modelsDir = path.join(__dirname, 'models');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
}

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function downloadModels() {
    console.log('Downloading face-api.js models...');
    for (const model of models) {
        const filepath = path.join(modelsDir, model.name);
        console.log(`Downloading ${model.name}...`);
        try {
            await downloadFile(model.url, filepath);
            console.log(`Downloaded ${model.name}`);
        } catch (error) {
            console.error(`Error downloading ${model.name}:`, error);
        }
    }
    console.log('Download complete!');
}

downloadModels(); 