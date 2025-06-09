let currentTab = 'home';

// Format date as "DD MMM 'YY"
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return { day, month, year };
}

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

        // Fetch index.json
        console.log('Fetching index.json');
        const response = await fetch('index.json');
        if (!response.ok) throw new Error(`Failed to load index.json: ${response.status} ${response.statusText}`);
        const files = await response.json();
        console.log('index.json contents:', files);

        // Process each file
        let allItems = [];
        for (const file of files) {
            console.log(`Fetching file: ${file.path}`);
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
                    allItems.push(item);
                } else {
                    console.warn(`Skipping ${file.path} due to invalid frontmatter`);
                }
            } catch (error) {
                console.error(`Error processing ${file.path}:`, error);
            }
        }

        if (allItems.length === 0) {
            document.getElementById('content').innerHTML = '<p>No valid items found. Check your Markdown files for correct frontmatter (title, subtitle, date, time, content).</p>';
            console.error('No valid items loaded; check frontmatter in .md files');
            return;
        }

        // Sort by date (descending)
        allItems.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            if (isNaN(dateA) || isNaN(dateB)) {
                console.warn(`Invalid date/time in ${a.file} or ${b.file}`);
                return 0;
            }
            return dateB - dateA;
        });

        // Filter based on tab
        let filteredItems = allItems;
        if (currentTab === 'news') {
            filteredItems = allItems.filter(item => item.type === 'news');
        } else if (currentTab === 'assets') {
            filteredItems = allItems.filter(item => item.type === 'assets');
        } else if (currentTab === 'games') {
            filteredItems = allItems.filter(item => item.type === 'games');
        }

        console.log('Filtered items:', filteredItems);

        // Render list
        let listHtml = `<h2>${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</h2><ul>`;
        if (filteredItems.length === 0) {
            listHtml += `<li>No ${currentTab} items available.</li>`;
        } else {
            filteredItems.forEach((item, index) => {
                const tag = item.type === 'news' ? '[NEWS]' : item.type === 'assets' ? '[ASSET]' : '[GAME RELEASE]';
                const tagClass = `category-${item.type}`;
                const subtitleHtml = item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : '';
                const { day, month, year } = formatDate(item.date);
                const isLatest = index === 0 && currentTab === 'home'; // Latest only in Home tab
                listHtml += `
                    <li>
                        <div class="entry-button ${isLatest ? 'latest-entry' : ''}" onclick="loadItem('${item.file}')">
                            <div class="date-section">
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
        }
        listHtml += '</ul>';
        document.getElementById('content').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('content').innerHTML = '<p>Error loading content. Please check the console for details.</p>';
    }
}

function parseFrontmatter(content, type, file) {
    // Handle both \n and \r\n line endings
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

    // Validate date and time format
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
            const contentHtml = `<button onclick="switchTab('${currentTab}')">Back to List</button><br>${html}`;
            document.getElementById('content').innerHTML = contentHtml;
        })
        .catch(error => {
            console.error('Error loading item:', error);
            document.getElementById('content').innerHTML = '<p>Error loading item.</p>';
        });
}

// Initial load
switchTab('home');