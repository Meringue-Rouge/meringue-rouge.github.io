let currentTab = 'all'; // Default to 'all' tab
let dynamicElements = [];
let mouseXPos = null;
let mouseYPos = null;

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

window.addEventListener('load', updateSideImage);
window.addEventListener('resize', updateSideImage);

function switchTab(tab) {
    console.log(`Switching to tab: ${tab}`);
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick="switchTab('${tab}')"]`).classList.add('active');
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
                        if (!res.ok) throw new Error(`Failed to load ${file.path}: ${response.status} ${response.statusText}`);
                        return res.text();
                    });
                console.log(`Raw content of ${file.path}:`, JSON.stringify(fileContent));
                const item = parseFrontmatter(fileContent, file.type, file.path);
                if (item) {
                    console.log('Parsed item:', item);
                    // Default last updated to publish date if not present
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
            filteredItems = allItems; // Show all items for 'All' tab
        }

        console.log('Filtered items:', filteredItems);

        let listHtml = `<h2>${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</h2><ul>`;
        if (filteredItems.length === 0) {
            listHtml += `<li>No ${currentTab} items available.</li></ul><div class="list-bottom-space"></div>`;
        } else {
            filteredItems.forEach((item, index) => {
                const tag = item.type === 'news' ? 'News' : item.type === 'assets' ? 'Asset' : 'Game Release';
                const tagClass = `category-${item.type}`;
                const subtitleHtml = item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : '';
                const { day, month, year } = formatDate(item.lastUpdated);
                const isLatest = index === 0 && currentTab === 'all';
                const offset = index * 2;
                const isUpdated = item.lastUpdated !== (item.date + 'T' + item.time);
                listHtml += `
                    <li style="transform: translateZ(${5 + offset}px) translateX(${offset}px);">
                        <div class="entry-button ${isLatest ? 'latest-entry' : ''}" onclick="loadItem('${item.file}')">
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
                        </div>
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
    const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/;
    const match = content.match(frontmatterRegex);
    if (!match) {
        console.warn(`No frontmatter found in ${file}. Expected format: ---\\nkey: value\\n---`);
        return null;
    }

    const frontmatter = match[1];
    console.log(`Frontmatter for ${file}:`, frontmatter);
    const lines = frontmatter.split(/[\r\n]+/).filter(line => line.trim());
    let metadata = { type, file };

    lines.forEach((line, index) => {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
            const [, key, value] = match;
            metadata[key] = value.trim();
        } else {
            console.warn(`Invalid frontmatter line in ${file} at line ${index + 1}:`, line);
        }
    });

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

function loadItem(file) {
    console.log(`Loading item: ${file}`);
    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status} ${response.statusText}`);
            return response.text();
        })
        .then(content => {
            const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/);
            if (!match) throw new Error(`No frontmatter in ${file}`);
            const frontmatter = match[1];
            const lines = frontmatter.split(/[\r\n]+/).filter(line => line.trim());
            let metadata = {};
            lines.forEach(line => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match) {
                    const [, key, value] = match;
                    metadata[key] = value.trim();
                }
            });
            const html = marked.parse(metadata.content);
            const contentHtml = `<div class="markdown-frame"><button onclick="switchTab('${currentTab}')">Back to List</button><br>${html}</div>`;
            document.getElementById('content').innerHTML = contentHtml;
        })
        .catch(error => {
            console.error('Error loading item:', error);
            document.getElementById('content').innerHTML = '<p>Error loading item.</p>';
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

function createScrollingText() {
    const container = document.createElement('div');
    container.className = 'scrolling-text-container';
    document.body.appendChild(container);

    for (let i = 0; i < 3; i++) {
        const text = document.createElement('div');
        text.className = 'scrolling-text';
        text.textContent = 'MERINGUE ROUGE'.padEnd(20, ' ');
        text.style.top = `${i * 40}px`;
        container.appendChild(text);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createDynamicElements();
    createScrollingText();
    switchTab('all'); // Activate 'All' tab immediately after DOM is ready
});

window.addEventListener('resize', updateSideImage);