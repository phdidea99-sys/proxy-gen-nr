// আপনার অরিজিনাল কোড থেকে URLS এবং মূল ফাংশনালিটি
const URLS = {
    STANDARD: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRoydbgCE61hn48aKwnBfsx5HFZ6H2YGTnDrLvHaGpu5AhpySfFpgBb4wd72wC8X6tbYrYw8_uctp0k/pub?output=csv',
    FREE: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ7Yv6SR-TfyW7rL3mdWSiKgZ-Mdoday5cZL7A8hhqJIQ6GYAVYw9LOSkyGqUddV5q7IkV_tMeU73r/pub?output=csv'
};

let currentMode = 'free';
let proxyData = '';
let testData = '';
let allCountries = new Set();
let selectedCountries = new Set();

// যখন পেজ লোড হবে
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCountries();
});

function setupEventListeners() {
    // মোড সিলেক্টর
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            updateStatus('মোড পরিবর্তন করা হয়েছে: ' + currentMode);
        });
    });

    // ট্যাব সুইচিং
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // জেনারেট বাটন
    document.getElementById('generateBtn').addEventListener('click', generateProxies);

    // ডাউনলোড বাটন
    document.getElementById('downloadProxyBtn').addEventListener('click', () => downloadFile('proxy.txt'));
    document.getElementById('downloadTestBtn').addEventListener('click', () => downloadFile('proxytest.txt'));

    // কপি বাটন
    document.getElementById('copyAllBtn').addEventListener('click', copyAllProxies);
}

async function loadCountries() {
    try {
        // কিছু কমন দেশ যোগ করা
        const commonCountries = [
            'US - United States',
            'UK - United Kingdom', 
            'DE - Germany',
            'FR - France',
            'JP - Japan',
            'KR - South Korea',
            'IN - India',
            'BD - Bangladesh',
            'CA - Canada',
            'AU - Australia',
            'BR - Brazil',
            'RU - Russia',
            'SG - Singapore',
            'NL - Netherlands'
        ];

        const container = document.getElementById('countryCheckboxes');
        container.innerHTML = commonCountries.map(country => `
            <div class="checkbox-item">
                <input type="checkbox" id="${country.split(' - ')[0]}" 
                       value="${country.split(' - ')[0]}" checked>
                <label for="${country.split(' - ')[0]}">${country}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading countries:', error);
    }
}

async function generateProxies() {
    try {
        updateStatus('প্রক্সি ফেচ করা হচ্ছে...');
        updateProgress(30);

        // সিলেক্টেড কান্ট্রিগুলো সংগ্রহ
        const checkboxes = document.querySelectorAll('#countryCheckboxes input[type="checkbox"]:checked');
        selectedCountries = new Set(Array.from(checkboxes).map(cb => cb.value));

        // URL থেকে ডাটা ফেচ
        const url = currentMode === 'free' ? URLS.FREE : URLS.STANDARD;
        
        // এখানে আপনার অরিজিনাল secureFetch ফাংশন ব্যবহার করা হচ্ছে
        // কিন্তু ব্রাউজারের জন্য আমরা fetch API ব্যবহার করবো
        const response = await fetch(url);
        const csvData = await response.text();
        
        updateProgress(60);
        updateStatus('ডাটা প্রসেসিং হচ্ছে...');

        // CSV ডাটা প্রসেস করা
        const proxies = processCSVData(csvData);
        
        updateProgress(80);

        // প্রক্সি ফরম্যাট করা
        proxyData = proxies.map(p => `${p.ip}:${p.port}`).join('\n');
        testData = generateTestResults(proxies);

        // আউটপুট শো করা
        document.getElementById('proxyOutput').value = proxyData;
        document.getElementById('testOutput').value = testData;
        document.getElementById('proxyCount').textContent = `${proxies.length} টি প্রক্সি`;

        // স্ট্যাটিস্টিক্স আপডেট
        updateStats(proxies);

        // ডাউনলোড বাটন এনাবল
        document.getElementById('downloadProxyBtn').disabled = false;
        document.getElementById('downloadTestBtn').disabled = false;
        document.getElementById('copyAllBtn').disabled = false;

        updateProgress(100);
        updateStatus('✅ সম্পন্ন! ' + proxies.length + ' টি প্রক্সি জেনারেট হয়েছে');
        
        // Last update time
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('bn-BD');
        
        setTimeout(() => updateProgress(0), 2000);
    } catch (error) {
        updateStatus('❌ এরর: ' + error.message);
        updateProgress(0);
        console.error('Generation error:', error);
    }
}

function processCSVData(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const proxies = [];

    // IP এবং Port কলাম খুঁজে বের করা এবং Country কলাম
    const ipIndex = headers.findIndex(h => h.toLowerCase().includes('ip'));
    const portIndex = headers.findIndex(h => h.toLowerCase().includes('port'));
    const countryIndex = headers.findIndex(h => h.toLowerCase().includes('country'));

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > Math.max(ipIndex, portIndex)) {
            const ip = values[ipIndex]?.trim();
            const port = values[portIndex]?.trim();
            const country = countryIndex !== -1 ? values[countryIndex]?.trim() : 'Unknown';

            if (ip && port && isValidIP(ip) && isValidPort(port)) {
                // যদি কান্ট্রি ফিল্টার করা হয়
                if (selectedCountries.size === 0 || 
                    Array.from(selectedCountries).some(c => country.toUpperCase().includes(c))) {
                    proxies.push({ ip, port, country });
                    allCountries.add(country);
                }
            }
        }
    }

    return proxies;
}

function isValidIP(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
    });
}

function isValidPort(port) {
    const portNum = parseInt(port);
    return portNum > 0 && portNum <= 65535;
}

function generateTestResults(proxies) {
    const timestamp = new Date().toLocaleString('bn-BD');
    let testOutput = `🛡️ Proxy Test Results\n`;
    testOutput += `📅 Date: ${timestamp}\n`;
    testOutput += `⏰ Time: ${new Date().toLocaleTimeString('bn-BD')}\n`;
    testOutput += `${'='.repeat(50)}\n\n`;

    proxies.forEach((proxy, index) => {
        testOutput += `${'='.repeat(50)}\n`;
        testOutput += `🔹 Proxy #${index + 1}\n`;
        testOutput += `📍 IP: ${proxy.ip}:${proxy.port}\n`;
        testOutput += `🌍 Country: ${proxy.country}\n`;
        testOutput += `📊 Status: Testing...\n`;
        testOutput += `⚡ Speed: Pending\n`;
        testOutput += `🔒 Anonymity: Checking\n`;
        testOutput += `${'='.repeat(50)}\n\n`;
    });

    testOutput += `\n📈 Summary:\n`;
    testOutput += `Total Proxies: ${proxies.length}\n`;
    testOutput += `Generated by: Proxy Generator\n`;
    testOutput += `For testing: Use with caution\n`;

    return testOutput;
}

function updateStats(proxies) {
    document.getElementById('totalProxies').textContent = proxies.length;
    document.getElementById('workingProxies').textContent = 'Testing...';
    
    // কান্ট্রি স্ট্যাটিস্টিক্স
    const countryMap = {};
    proxies.forEach(p => {
        countryMap[p.country] = (countryMap[p.country] || 0) + 1;
    });

    document.getElementById('countryCount').textContent = Object.keys(countryMap).length;
    
    const countryStatsHtml = Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([country, count]) => `
            <div class="country-stat">
                <strong>${getCountryFlag(country)} ${country}</strong>
                <br>${count} proxies
            </div>
        `).join('');
    
    document.getElementById('countryStats').innerHTML = countryStatsHtml;
}

function getCountryFlag(country) {
    const flagMap = {
        'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
        'JP': '🇯🇵', 'KR': '🇰🇷', 'IN': '🇮🇳', 'BD': '🇧🇩',
        'CA': '🇨🇦', 'AU': '🇦🇺', 'BR': '🇧🇷', 'RU': '🇷🇺',
        'SG': '🇸🇬', 'NL': '🇳🇱', 'IT': '🇮🇹', 'ES': '🇪🇸'
    };
    return flagMap[country] || '🌍';
}

function downloadFile(filename) {
    const content = filename === 'proxy.txt' ? proxyData : testData;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateStatus(`✅ ${filename} ডাউনলোড হয়েছে!`);
}

function copyAllProxies() {
    navigator.clipboard.writeText(proxyData).then(() => {
        updateStatus('📋 সব প্রক্সি কপি করা হয়েছে!');
    }).catch(err => {
        updateStatus('❌ কপি করা যায়নি: ' + err.message);
    });
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function updateProgress(percentage) {
    document.getElementById('progressFill').style.width = percentage + '%';
}