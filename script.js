let currentTab = 'all'; // Default to 'all' tab
let dynamicElements = [];
let mouseXPos = null;
let mouseYPos = null;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let hoveredButtons = new WeakSet();
let expandedButton = null; // Track the currently expanded button

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return { day, month, year };
}

function updateSideImage() {
    const sideImage = document.getElementById('side-image');
    if (window.innerWidth <= 768) {
        sideImage.src = 'images/character-mobile.png';
    } else {
        sideImage.src = 'images/character.png';
    }
}

function playCharacterClickSound(rarity) {
    let audioFile;
    switch (rarity) {
        case 'Giga Rare':
            audioFile = 'ultra_rare_click.wav';
            break;
        case 'Mega Rare':
            audioFile = 'super_rare_click.wav';
            break;
        default:
            audioFile = 'character_click.wav';
    }
    const audio = new Audio(audioFile);
    audio.play().catch(error => console.error('Error playing sound:', error));
}

window.addEventListener('load', updateSideImage);
window.addEventListener('resize', updateSideImage);

function switchTab(tab) {
    console.log(`Switching to tab: ${tab}`);
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick="switchTab('${tab}')"]`).classList.add('active');
    playClickSound();
    loadContent();
}

async function loadContent() {
    try {
        console.log(`Loading content for tab: ${currentTab}`);

        const response = await fetch('index.json');
        if (!response.ok) throw new Error(`Failed to load index.json: ${response.status} ${response.statusText}`);
        const files = await response.json();
        console.log('index.json contents:', files);

        let allItems = [];
        for (const file of files) {
            try {
                const fileContent = await fetch(file.path)
                    .then(res => {
                        if (!res.ok) throw new Error(`Failed to load ${file.path}: ${res.status} ${res.statusText}`);
                        return res.text();
                    });
                console.log(`Raw content of ${file.path}:`, JSON.stringify(fileContent));
                const item = parseFrontmatter(fileContent, file.type, file.path);
                if (item) {
                    console.log('Parsed item:', item);
                    item.lastUpdated = item.lastUpdated || item.date + 'T' + item.time;
                    allItems.push(item);
                } else {
                    console.warn(`Skipping ${file.path} due to invalid frontmatter`);
                }
            } catch (error) {
                console.error(`Error processing ${file.path}: ${error}`);
            }
        }

        if (allItems.length === 0) {
            document.getElementById('content').innerHTML = '<p>No valid items found. Check your Markdown files for correct frontmatter (title, subtitle, date, time, content).</p>';
            console.error('No valid items loaded; check frontmatter in .md files');
            return;
        }

        allItems.sort((a, b) => {
            const dateA = new Date(a.lastUpdated);
            const dateB = new Date(b.lastUpdated);
            if (isNaN(dateA) || isNaN(dateB)) {
                console.warn(`Invalid lastUpdated in ${a.file} or ${b.file}`);
                return 0;
            }
            return dateB - dateA;
        });

        let filteredItems = allItems;
        if (currentTab === 'news') {
            filteredItems = allItems.filter(item => item.type === 'news');
        } else if (currentTab === 'assets') {
            filteredItems = allItems.filter(item => item.type === 'assets');
        } else if (currentTab === 'games') {
            filteredItems = allItems.filter(item => item.type === 'games');
        } else if (currentTab === 'all') {
            filteredItems = allItems;
        }

        console.log('Filtered items:', filteredItems);

        let listHtml = `<h2>${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</h2><ul>`;
        if (filteredItems.length === 0) {
            listHtml += `<li>No ${currentTab} items available.</li></ul><div class="list-bottom-space"></div>`;
        } else {
            filteredItems.forEach((item, index) => {
                const tag = item.type === 'news' ? 'News' : item.type === 'assets' ? 'Asset' : item.type === 'about' ? 'About' : 'Game Release';
                const tagClass = `category-${item.type}`;
                const subtitleHtml = item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : '';
                const { day, month, year } = formatDate(item.lastUpdated);
                const isLatest = index === 0 && currentTab === 'all';
                const offset = index * 2;
                const isUpdated = item.lastUpdated !== (item.date + 'T' + item.time);
                const thumbnailHtml = item.thumbnail ? `<div class="thumbnail-preview" style="background-image: url('${item.thumbnail}');"></div>` : '';
                listHtml += `
                    <li style="transform: translateZ(${5 + offset}px) translateX(${offset}px);">
                        <div class="entry-button ${isLatest ? 'latest-entry' : ''}" data-file="${item.file}" onclick="toggleItem(this, '${item.file}')">
                            <div class="date-section ${isUpdated ? 'updated' : ''}">
                                <div class="date-day">${day}</div>
                                <div class="date-month">${month}</div>
                                <div class="date-year">'${year}</div>
                            </div>
                            <div class="entry-content">
                                <div class="title">
                                    <span class="category-tag ${tagClass}">${tag}</span>
                                    ${item.title}
                                </div>
                                ${subtitleHtml}
                            </div>
                            ${thumbnailHtml}
                        </div>
                        <div class="expanded-content" id="expanded-${item.file.replace(/[\/.]/g, '-')}" style="display: none;"></div>
                    </li>`;
            });
            listHtml += `</ul><div class="list-bottom-space"></div>`;
        }
        document.getElementById('content').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('content').innerHTML = '<p>Error loading content. Please check the console for details.</p>';
    }
}

function parseFrontmatter(content, type, file) {
    const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (!match) {
        console.warn(`No frontmatter found in ${file}. Expected format: ---\\nkey: value\\n---\\ncontent`);
        return null;
    }

    const frontmatter = match[1];
    const bodyContent = match[2].trim();
    console.log(`Frontmatter for ${file}:`, frontmatter);
    console.log(`Body content for ${file}:`, bodyContent);

    const lines = frontmatter.split(/[\r\n]+/).filter(line => line.trim());
    let metadata = { type, file };

    let currentKey = null;
    let currentValue = [];

    lines.forEach((line, index) => {
        const keyMatch = line.match(/^(\w+):\s*(.*)$/);
        if (keyMatch) {
            if (currentKey && currentValue.length > 0) {
                metadata[currentKey] = currentValue.join('\n').trim();
                currentValue = [];
            }
            const [, key, value] = keyMatch;
            currentKey = key;
            if (value.startsWith('|')) {
                currentValue = [value.slice(1).trim()];
            } else {
                metadata[key] = value.trim();
                currentKey = null;
            }
        } else if (currentKey && line.trim()) {
            currentValue.push(line.trim());
        } else {
            console.warn(`Invalid frontmatter line in ${file} at line ${index + 1}:`, line);
        }
    });

    if (currentKey && currentValue.length > 0) {
        metadata[currentKey] = currentValue.join('\n').trim();
    }

    if (!metadata.content && bodyContent) {
        metadata.content = bodyContent;
    }

    const requiredFields = ['title', 'date', 'time', 'content'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    if (missingFields.length > 0) {
        console.warn(`Incomplete frontmatter in ${file}. Missing fields:`, missingFields);
        return null;
    }

    const dateTime = new Date(`${metadata.date}T${metadata.time}`);
    if (isNaN(dateTime)) {
        console.warn(`Invalid date/time format in ${file}: ${metadata.date} ${metadata.time}`);
        return null;
    }

    return metadata;
}

function toggleItem(button, file) {
    console.log(`Toggling item: ${file}`);
    const expandedDiv = document.getElementById(`expanded-${file.replace(/[\/.]/g, '-')}`);
    
    // If this button is already expanded, collapse it
    if (expandedButton === button) {
        expandedDiv.style.display = 'none';
        button.classList.remove('expanded');
        expandedButton = null;
        playClickSound();
        return;
    }

    // Collapse any previously expanded button
    if (expandedButton) {
        const prevExpandedDiv = document.getElementById(`expanded-${expandedButton.getAttribute('data-file').replace(/[\/.]/g, '-')}`);
        prevExpandedDiv.style.display = 'none';
        expandedButton.classList.remove('expanded');
    }

    // Expand the clicked button
    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status} ${response.statusText}`);
            return response.text();
        })
        .then(content => {
            const item = parseFrontmatter(content, null, file);
            if (!item) throw new Error(`No valid frontmatter in ${file}`);
            const html = marked.parse(item.content);
            
            // Create buttons for links if they exist
            let linksHtml = '';
            if (item.itch_link) {
                linksHtml += `<a href="${item.itch_link}" target="_blank" class="link-button itch-button">Itch.io</a>`;
            }
            if (item.github_link) {
                linksHtml += `<a href="${item.github_link}" target="_blank" class="link-button github-button">GitHub</a>`;
            }
            if (item.steam_workshop_link) {
                linksHtml += `<a href="${item.steam_workshop_link}" target="_blank" class="link-button steam-button">Steam Workshop</a>`;
            }
            if (item.other_link) {
                linksHtml += `<a href="${item.other_link}" target="_blank" class="link-button other-button">Website</a>`;
            }
            if (item.download_link) {
                linksHtml += `<a href="${item.download_link}" target="_blank" class="link-button download-button">Download</a>`;
            }
            
            const thumbnailHtml = item.thumbnail ? `<img src="${item.thumbnail}" alt="Thumbnail" class="full-thumbnail">` : '';
            expandedDiv.innerHTML = `
                <div class="markdown-frame">
                    ${thumbnailHtml}
                    ${html}
                    ${linksHtml ? '<div class="link-buttons">' + linksHtml + '</div>' : ''}
                </div>`;
            expandedDiv.style.display = 'block';
            button.classList.add('expanded');
            expandedButton = button;
            playClickSound();
        })
        .catch(error => {
            console.error('Error loading item:', error);
            expandedDiv.innerHTML = '<p>Error loading item.</p>';
            expandedDiv.style.display = 'block';
            button.classList.add('expanded');
            expandedButton = button;
        });
}

function loadAbout() {
    console.log('Loading About Me');
    fetch('about.md')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load about.md: ${response.status} ${response.statusText}`);
            return response.text();
        })
        .then(content => {
            const html = marked.parse(content);
            document.getElementById('content').innerHTML = `<div class="markdown-frame"><button onclick="switchTab('${currentTab}')"><i class="fas fa-arrow-left"></i> Return to List</button><br>${html}</div>`;
            playClickSound();
        })
        .catch(error => {
            console.error('Error loading about.md:', error);
            document.getElementById('content').innerHTML = '<p>Error loading About Me. Please check the console for details.</p>';
        });
}

function createDynamicElements() {
    const background = document.querySelector('.global-background');
    const colors = ['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc'];
    const numElements = 15;

    for (let i = 0; i < numElements; i++) {
        const element = document.createElement('div');
        element.className = 'dynamic-triangle';
        element.style.position = 'absolute';
        element.style.opacity = '0.7';
        element.style.background = colors[Math.floor(Math.random() * colors.length)];
        element.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        element.style.width = `${150 + Math.random() * 100}px`;
        element.style.height = `${150 + Math.random() * 100}px`;
        background.appendChild(element);

        const size = parseInt(element.style.width);
        const x = Math.random() * (window.innerWidth - size);
        const y = Math.random() * (window.innerHeight - size);
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        dynamicElements.push({
            element,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size
        });
    }

    animateElements();
}

function animateElements() {
    function update() {
        dynamicElements.forEach(item => {
            let { element, vx, vy, size } = item;
            let x = parseFloat(element.style.left);
            let y = parseFloat(element.style.top);

            if (x + size > window.innerWidth) {
                vx = -Math.abs(vx) * 0.8;
                x = window.innerWidth - size;
            } else if (x < 0) {
                vx = Math.abs(vx) * 0.8;
                x = 0;
            }
            if (y + size > window.innerHeight) {
                vy = -Math.abs(vy) * 0.8;
                y = window.innerHeight - size;
            } else if (y < 0) {
                vy = Math.abs(vy) * 0.8;
                y = 0;
            }

            const mouseX = mouseXPos || window.innerWidth / 2;
            const mouseY = mouseYPos || window.innerHeight / 2;
            const dx = mouseX - (x + size / 2);
            const dy = mouseY - (y + size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 200) {
                const angle = Math.atan2(dy, dx);
                const force = (200 - distance) / 200;
                vx += Math.cos(angle) * force * 0.1;
                vy += Math.sin(angle) * force * 0.1;
            }

            x += vx;
            y += vy;
            vx *= 0.98;
            vy *= 0.98;

            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        });

        requestAnimationFrame(update);
    }

    update();
}

function playHoverSound() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
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
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
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
    switchTab('all');

    // Handle side image click with gacha system
    const sideImage = document.getElementById('side-image');
    const overlay = document.getElementById('gacha-overlay');
    const gachaData = [
        { id: 1, src: 'images/character_alt_1.png', stars: 1, rarity: 'Common', title: 'Yvonne', description: 'Yvonne, the mascot of Meringue Rouge, in her royal dress. Not to be confused with a character from an online game who wielded a spear.', odds: 0.30 },
        { id: 2, src: 'images/character_alt_2.png', stars: 2, rarity: 'Uncommon', title: 'Punk Yvonne', description: 'The vest and dress makes for a unique combination!', odds: 0.25 },
        { id: 3, src: 'images/character_alt_3.png', stars: 3, rarity: 'Rare', title: 'Home Yvonne', description: 'All mascots have a home, right? Are homeless mascots even a thing?', odds: 0.30 },
        { id: 4, src: 'images/character_alt_4.png', stars: 4, rarity: 'Mega Rare', title: 'Trackgirl Yvonne', description: 'This outfit was originally intended to be used for our protagonist, but was not used in the end.', odds: 0.10 },
        { id: 5, src: 'images/character_alt_5.png', stars: 5, rarity: 'Giga Rare', title: 'Summer Yvonne', description: 'When designing mascots, they have to be visually appealing! Her three sizes ar-', odds: 0.05 }
    ];

    sideImage.addEventListener('click', () => {
        sideImage.classList.add('clicked');
        const originalSrc = sideImage.src;

        // Weighted random selection based on odds
        const roll = Math.random();
        let cumulative = 0;
        let selectedGacha = gachaData[0];
        for (let item of gachaData) {
            cumulative += item.odds;
            if (roll <= cumulative) {
                selectedGacha = item;
                break;
            }
        }

        playCharacterClickSound(selectedGacha.rarity);

        sideImage.src = selectedGacha.src;
        const rect = sideImage.getBoundingClientRect();
        overlay.style.left = `${rect.left + rect.width * 0.2}px`; // Offset to the right
        overlay.style.top = `${rect.bottom - rect.height * 0.3}px`; // Lower half
        overlay.style.width = `${rect.width * 1.2}px`; // 20% wider
        overlay.style.height = `${rect.height * 0.2}px`; // 20% of image height
        overlay.innerHTML = `
            <div class="stars">${'★'.repeat(selectedGacha.stars)}</div>
            <div class="rarity">${selectedGacha.rarity}</div>
            <div class="get">GET!</div>
            <div class="title">${selectedGacha.title}</div>
            <div class="description">${selectedGacha.description}</div>
        `;
        overlay.classList.add('active');
        if (selectedGacha.rarity === 'Mega Rare' || selectedGacha.rarity === 'Giga Rare') {
            overlay.classList.add('shine');
            overlay.classList.add(selectedGacha.rarity.toLowerCase().replace(' ', '-'));
        }

        setTimeout(() => {
            sideImage.src = originalSrc;
            sideImage.classList.remove('clicked');
            overlay.classList.remove('active', 'shine', 'mega-rare', 'giga-rare');
        }, 2000);
    });

    // Track hovered buttons to play sound only on initial hover
    document.body.addEventListener('mouseover', (e) => {
        const button = e.target.closest('.tab-button, .entry-button, .markdown-frame button, .about-button, .social-button, .link-button');
        if (button && !hoveredButtons.has(button)) {
            hoveredButtons.add(button);
            playHoverSound();
        }
    });
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button, .entry-button, .markdown-frame button, .about-button, .social-button, .link-button');
        if (button) {
            playClickSound();
        }
    });
});

window.addEventListener('resize', updateSideImage);