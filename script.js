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

    // 1. Update Bio
    const bioEl = document.getElementById('bio-text');
    if (bioEl && data.bio) { bioEl.textContent = data.bio[currentLang]; }

    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    let html = '';

    // 2. HERO STEAM BANNER (All / Games)
    if (currentTab === 'all' || currentTab === 'games') {
        const steamAppID = '4106270'; 
        const bannerTitle = currentLang === 'en' ? "Ecrazeus Castle" : "Ecrazeus Castle";
        const bannerMsg = currentLang === 'en' 
            ? "Become the new owner of <strong>Ecrazeus Castle</strong>. Coming 2026." 
            : "<strong>エクラゼウス城</strong>の新しい所有者になろう。2026年公開予定。";

        html += `
            <div class="steam-promo-hero-container">
                <div class="promo-overlay"></div>
                <img src="images/promo-ec-hero.png" class="promo-hero-image" alt="Hero Character">
                
                <div class="promo-content-wrapper">
                    <div class="promo-text-hover">
                        <h2>${bannerTitle}</h2>
                        <p>${bannerMsg}</p>
                    </div>
                    
                    <iframe src="https://store.steampowered.com/widget/${steamAppID}/" class="steam-embed-frame"></iframe>
                </div>
            </div>
        `;
    }

    // 3. Filter Items
    let itemsToShow = data.items.filter(item => item.type !== 'news');
    if (currentTab !== 'all') {
        itemsToShow = itemsToShow.filter(item => item.type === currentTab);
    }

    // 4. Generate Grid
    if (itemsToShow.length === 0) {
        html += `<p style="text-align:center; color:#999; padding: 20px;">No items found.</p>`;
    } else {
        html += '<div class="grid">';
        itemsToShow.forEach(item => {
            let linksHtml = '';
            if (item.links) {
                Object.keys(item.links).forEach(key => {
                    const type = key.replace('_link', ''); 
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

// --- AUDIO ---
function playClickSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioContext.currentTime);
    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.15);
}