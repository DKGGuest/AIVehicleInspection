const https = require('https');

const API_KEY = 'AIzaSyCvCSP7Tad18kzwGrSmecZyQxr3qfJoGJc';

// Helper function to call API
function checkModel(modelName) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

        const data = JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`Model: ${modelName} -> Status: ${res.statusCode}`);
                if (res.statusCode !== 200) {
                    // console.log('Error:', body);
                }
                resolve(res.statusCode);
            });
        });

        req.write(data);
        req.end();
    });
}

async function verifyModels() {
    console.log("Checking available models...");

    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.0-pro',
        'gemini-pro',
        'gemini-2.0-flash-exp' // New experimental model
    ];

    for (const model of models) {
        await checkModel(model);
    }
}

verifyModels();
