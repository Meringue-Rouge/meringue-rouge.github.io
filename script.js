let currentTab = 'all';
let currentLang = 'en';
let dynamicElements = [];
let mouseXPos = null;
let mouseYPos = null;
let audioContext = null;
let hoveredButtons = new WeakSet();
let data = null;

function updateSideImage() {
    const sideImage = document.getElementById('side-image');
    if (window.innerWidth <= 768) {
        sideImage.src = 'images/character-mobile.png';
    } else {
        sideImage.src = 'images/character.png';
    }
}

async function translate(text, fromLang, toLang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const result = await response.json();
        return result[0].reduce((acc, part) => acc + part[0], '');
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

function toggleLang() {
    currentLang = currentLang === 'en' ? 'jp' : 'en';
    document.getElementById('lang-switch').textContent = currentLang === 'en' ? '日本語' : 'English';
    document.getElementById('feedback-box').textContent = currentLang === 'en' ? 'Leave me a question or request anonymously!' : '匿名で質問やリクエストをお寄せください！';
    loadContent();
    playClickSound();
}

window.addEventListener('load', () => {
    updateSideImage();
    fetch('content.json')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load content.json: ${response.status} ${response.statusText}`);
            return response.json();
        })
        .then(json => {
            data = json;
            toggleLang();
        })
        .catch(error => {
            console.error('Error loading content.json:', error);
            document.getElementById('content').innerHTML = '<p>Error loading content. Please check the console for details.</p>';
        });
});
window.addEventListener('resize', updateSideImage);

function switchTab(tab) {
    console.log(`Switching to tab: ${tab}`);
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick="switchTab('${tab}')"]`).classList.add('active');
    playClickSound();
    loadContent();
}

function loadContent() {
    console.log(`Loading content for tab: ${currentTab}`);
    let html = '';
    if (currentTab === 'all') {
        const categories = ['news', 'assets', 'games'];
        categories.forEach(cat => {
            const catItems = data.items.filter(item => item.type === cat);
            if (catItems.length > 0) {
                html += `<h2>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h2>`;
                html += '<div class="grid">';
                catItems.forEach(item => {
                    const subtitleHtml = item.subtitle[currentLang] ? `<p class="subtitle">${item.subtitle[currentLang]}</p>` : '';
                    const tagClass = `category-${item.type}`;
                    const contentHtml = item.content[currentLang];
                    let linksHtml = '';
                    Object.keys(item.links).forEach(key => {
                        const className = key.replace('_link', '') + '-button';
                        linksHtml += `<a href="${item.links[key]}" target="_blank" class="link-button ${className}">${key.replace('_link', '').charAt(0).toUpperCase() + key.replace('_link', '').slice(1)}</a>`;
                    });
                    html += `
                        <div class="card">
                            <img src="${item.thumbnail}" class="thumbnail" alt="${item.title[currentLang]}">
                            <h3 class="title">${item.title[currentLang]}</h3>
                            ${subtitleHtml}
                            <div class="content">${contentHtml}</div>
                            ${linksHtml ? '<div class="link-buttons">' + linksHtml + '</div>' : ''}
                        </div>
                    `;
                });
                html += '</div>';
            }
        });
    } else {
        const catItems = data.items.filter(item => item.type === currentTab);
        if (catItems.length > 0) {
            html += `<h2>${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</h2>`;
            html += '<div class="grid">';
            catItems.forEach(item => {
                const subtitleHtml = item.subtitle[currentLang] ? `<p class="subtitle">${item.subtitle[currentLang]}</p>` : '';
                const tagClass = `category-${item.type}`;
                const contentHtml = item.content[currentLang];
                let linksHtml = '';
                Object.keys(item.links).forEach(key => {
                    const className = key.replace('_link', '') + '-button';
                    linksHtml += `<a href="${item.links[key]}" target="_blank" class="link-button ${className}">${key.replace('_link', '').charAt(0).toUpperCase() + key.replace('_link', '').slice(1)}</a>`;
                }); 
                html += `
                    <div class="card">
                        <img src="${item.thumbnail}" class="thumbnail${item.type === 'news' ? ' news-thumbnail' : ''}" alt="${item.title[currentLang]}">
                        <h3 class="title">${item.title[currentLang]}</h3>
                        ${subtitleHtml}
                        <div class="content">${contentHtml}</div>
                        ${linksHtml ? '<div class="link-buttons">' + linksHtml + '</div>' : ''}
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += `<p>No ${currentTab} items available.</p>`;
        }
    }
    document.getElementById('content').innerHTML = html + '<div class="list-bottom-space"></div>';
}

function createDynamicElements() {
    // Optional: Add Frutiger Aero dynamic elements like floating orbs
    const orb = document.createElement('div');
    orb.style.position = 'fixed';
    orb.style.width = '50px';
    orb.style.height = '50px';
    orb.style.background = 'radial-gradient(circle, rgba(255, 102, 102, 0.8), rgba(255, 204, 204, 0.3))';
    orb.style.borderRadius = '50%';
    orb.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.5)';
    orb.style.top = '10%';
    orb.style.left = '10%';
    orb.style.animation = 'float 6s ease-in-out infinite';
    document.body.appendChild(orb);
    dynamicElements.push(orb);
}

function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(error => console.error('Error resuming AudioContext:', error));
    }
}

function playHoverSound() {
    initializeAudioContext();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    oscillator1.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(180, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.0);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 1.0);
    oscillator2.stop(audioContext.currentTime + 1.0);
}

function playClickSound() {
    initializeAudioContext();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    oscillator1.frequency.setValueAtTime(120, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(140, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.5);
    oscillator2.stop(audioContext.currentTime + 0.5);
}

document.addEventListener('DOMContentLoaded', () => {
    createDynamicElements();

    document.body.addEventListener('mouseover', (e) => {
        const button = e.target.closest('.tab-button, .markdown-frame button, .social-button, .link-button, #lang-switch');
        if (button && !hoveredButtons.has(button)) {
            hoveredButtons.add(button);
            playHoverSound();
        }
    });
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button, .markdown-frame button, .social-button, .link-button, #lang-switch');
        if (button) {
            playClickSound();
        }
    });
});

// Add floating animation for Frutiger Aero effect
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes float {
        0% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
        100% { transform: translateY(0); }
    }
`;
document.head.appendChild(styleSheet);