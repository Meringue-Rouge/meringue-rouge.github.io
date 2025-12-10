let currentTab = 'all';
let currentLang = 'en';
let data = null;
let audioContext = null;

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    fetch('content.json')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load content.json`);
            return response.json();
        })
        .then(json => {
            data = json;
            renderContent(); 
        })
        .catch(error => {
            console.error('Error loading content.json:', error);
            document.getElementById('content').innerHTML = '<p>Error loading content.</p>';
        });
        
    // Audio is initialized on first interaction
});

// --- CORE FUNCTIONS ---

function toggleLang() {
    currentLang = currentLang === 'en' ? 'jp' : 'en';
    const langBtn = document.getElementById('lang-switch');
    if (langBtn) langBtn.textContent = currentLang === 'en' ? '日本語' : 'English';
    playClickSound();
    renderContent();
}

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${tab}'`)) {
            btn.classList.add('active');
        }
    });

    playClickSound();
    renderContent();
}

function renderContent() {
    if (!data) return;

    // 1. Update Bio (Only visible on Desktop due to CSS)
    const bioEl = document.getElementById('bio-text');
    if (bioEl && data.bio) {
        bioEl.textContent = data.bio[currentLang]; 
    }

    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    let html = '';

    // 2. Steam Banner (Always show on 'all' or 'games')
    if (currentTab === 'all' || currentTab === 'games') {
        // REPLACE WITH ACTUAL STEAM APP ID
        const steamAppID = '1234567'; 
        const bannerTitle = currentLang === 'en' ? "✨ Coming Soon! ✨" : "✨ 近日公開！ ✨";
        const bannerMsg = currentLang === 'en' 
            ? "My first game release on Steam, Ecrazeus Castle. Please <strong>wishlist</strong>!" 
            : "私の初のSteamゲームリリース、Ecrazeus Castle。<strong>ウィッシュリスト</strong>に追加してください！";

        html += `
            <div class="steam-promo-wrapper">
                <div class="steam-promo-content">
                    <div class="steam-text">
                        <h2 style="color:#ff9aa2; margin:0 0 10px 0; font-size: 1.2rem;">${bannerTitle}</h2>
                        <p style="margin:0; font-size: 0.9rem;">${bannerMsg}</p>
                    </div>
                    <iframe src="https://store.steampowered.com/widget/${steamAppID}/" class="steam-embed-frame"></iframe>
                </div>
            </div>
        `;
    }

    // 3. Filter Items
    // LOGIC: Exclude 'news' type from grids completely.
    let itemsToShow = data.items.filter(item => item.type !== 'news');

    if (currentTab !== 'all') {
        itemsToShow = itemsToShow.filter(item => item.type === currentTab);
    }

    // 4. Generate Cards
    if (itemsToShow.length === 0) {
        html += `<p style="text-align:center; color:#999; padding: 20px;">No items found.</p>`;
    } else {
        html += '<div class="grid">';
        itemsToShow.forEach(item => {
            // Generate Links
            let linksHtml = '';
            if (item.links) {
                Object.keys(item.links).forEach(key => {
                    const type = key.replace('_link', ''); 
                    const label = type.charAt(0).toUpperCase() + type.slice(1);
                    // Use shortened labels for compact design
                    const shortLabel = type === 'itch' ? 'Itch' : 
                                     type === 'github' ? 'Git' : 
                                     type === 'steam' ? 'Steam' : 
                                     type === 'website' ? 'Web' : 'Link';
                    
                    linksHtml += `<a href="${item.links[key]}" target="_blank" class="link-button ${type}-button">${shortLabel}</a>`;
                });
            }

            const title = item.title[currentLang] || item.title['en'];
            const subtitleText = item.subtitle[currentLang] || '';
            const desc = item.content[currentLang] || item.content['en'];

            html += `
                <div class="card">
                    <img src="${item.thumbnail}" class="thumbnail" alt="${title}" loading="lazy">
                    <div class="card-body">
                        <h3 class="title">${title}</h3>
                        ${subtitleText ? `<p class="subtitle">${subtitleText}</p>` : ''}
                        <div class="content-text">${desc}</div>
                        <div class="link-buttons">${linksHtml}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    contentEl.innerHTML = html;
}

// --- AUDIO (Soft Interaction) ---
function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error(e));
    }
}

function playClickSound() {
    initializeAudioContext();
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    // Softer, lower pitch pop for the new theme
    osc.frequency.setValueAtTime(600, audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.15);
}