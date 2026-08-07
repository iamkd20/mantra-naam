// DOM Elements
const mantraList = document.getElementById('mantraList');
const naamList = document.getElementById('naamList');
const refreshBtn = document.getElementById('refreshBtn');
const newFileBtn = document.getElementById('newFileBtn');
const currentFileName = document.getElementById('currentFileName');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const formContainer = document.getElementById('formContainer');

// Modal Elements
const newFileModal = document.getElementById('newFileModal');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const createFileBtn = document.getElementById('createFileBtn');
const newFileType = document.getElementById('newFileType');
const newFileSubfolder = document.getElementById('newFileSubfolder');
const newFileName = document.getElementById('newFileName');

// State
let currentFilePath = null;
let currentData = null; // Holds the parsed JSON
let fileType = null; // 'mantra' or 'naam'
let isUnsaved = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFiles();
});

// Fetch and display file list
async function loadFiles() {
    try {
        const res = await fetch('/api/files');
        const data = await res.json();
        
        mantraList.innerHTML = '';
        naamList.innerHTML = '';
        
        data.files.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file;
            li.title = file;
            li.onclick = () => openFile(file, li);
            
            if (file.startsWith('mantras')) {
                mantraList.appendChild(li);
            } else if (file.startsWith('naams')) {
                naamList.appendChild(li);
            }
        });
    } catch (err) {
        showStatus('Failed to load files', 'error');
    }
}

function markUnsaved() {
    if (currentFilePath) {
        isUnsaved = true;
        currentFileName.textContent = currentFilePath + ' *';
        saveBtn.disabled = !validateForm();
    }
}

function validateForm() {
    let isValid = true;
    const requiredInputs = formContainer.querySelectorAll('.required-input');
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
        }
    });
    return isValid;
}

// Open a file
async function openFile(filePath, listItem) {
    if (isUnsaved) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
    }

    try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        currentData = data.content;
        currentFilePath = filePath;
        
        // Determine type
        if (currentData.mantras !== undefined) {
            fileType = 'mantra';
        } else if (currentData.names !== undefined) {
            fileType = 'naam';
        } else {
            // fallback, could be index.json or something else.
            // In this specific task, we'll try to guess based on path
            fileType = filePath.startsWith('mantras') ? 'mantra' : 'naam';
        }

        renderForm();
        
        // Update State
        isUnsaved = false;
        currentFileName.textContent = filePath;
        saveBtn.disabled = true;
        
        // Update UI Selection
        document.querySelectorAll('.file-list li').forEach(el => el.classList.remove('active'));
        if (listItem) listItem.classList.add('active');

    } catch (err) {
        console.error(err);
        showStatus('Failed to open file', 'error');
    }
}

// ================= FORM RENDERING =================

function renderForm() {
    formContainer.innerHTML = ''; // clear

    if (fileType === 'mantra' && currentData.mantras !== undefined) {
        renderMantraForm();
    } else if (fileType === 'naam' && currentData.names !== undefined) {
        renderNaamForm();
    } else {
        // Fallback for index.json which has a different schema
        formContainer.innerHTML = `<div class="empty-state">This file has a different structure (likely index.json). Please use a code editor for this specific file, or create a new file to see the form.</div>`;
    }
    
    // Attach change listeners to all inputs to mark unsaved
    formContainer.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', markUnsaved);
        el.addEventListener('change', markUnsaved);
    });

    // Attach upload listeners
    attachUploadListeners();
}

function attachUploadListeners() {
    document.querySelectorAll('.upload-trigger-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const container = e.target.closest('.upload-flex');
            const fileInput = container.querySelector('.hidden-file-input');
            fileInput.click();
        });
    });

    document.querySelectorAll('.hidden-file-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const uploadType = e.target.dataset.type; // 'image' or 'audio'
            const container = e.target.closest('.upload-flex');
            const textInput = container.querySelector('.data-input');
            const btn = container.querySelector('.upload-trigger-btn');

            const formData = new FormData();
            
            // Append customName BEFORE the file so Multer can read it during file parsing
            if (textInput.value.trim() !== '') {
                formData.append('customName', textInput.value.trim());
            }
            formData.append('file', file);

            try {
                btn.textContent = 'Uploading...';
                btn.disabled = true;

                const res = await fetch('/api/upload/' + uploadType, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                // Update text input with just filename as requested
                textInput.value = data.filename;
                markUnsaved();
                showStatus('Upload successful!', 'success');
            } catch (err) {
                console.error(err);
                alert('Upload failed: ' + err.message);
            } finally {
                btn.textContent = 'Upload';
                btn.disabled = false;
                e.target.value = ''; // clear file input
            }
        });
    });
}

function createInput(label, value, type = 'text', required = false) {
    const safeVal = value === undefined || value === null ? '' : String(value);
    const reqStar = required ? '<span class="req-star">*</span>' : '';
    const reqClass = required ? 'required-input' : '';
    return `
        <div class="form-group">
            <label>${label} ${reqStar}</label>
            <input type="${type}" value="${safeVal.replace(/"/g, '&quot;')}" class="data-input ${reqClass}">
        </div>
    `;
}

function createUploadInput(label, value, uploadType, required = false) {
    const safeVal = value === undefined || value === null ? '' : String(value);
    const reqStar = required ? '<span class="req-star">*</span>' : '';
    const reqClass = required ? 'required-input' : '';
    // uploadType is 'image' or 'audio'
    const accept = uploadType === 'image' ? 'image/*' : 'audio/*';
    
    return `
        <div class="form-group upload-group">
            <label>${label} ${reqStar}</label>
            <div class="upload-flex">
                <input type="text" value="${safeVal.replace(/"/g, '&quot;')}" class="data-input ${reqClass}" placeholder="e.g. file.${uploadType === 'image' ? 'png' : 'mp3'}">
                <input type="file" class="hidden-file-input" accept="${accept}" data-type="${uploadType}" style="display:none">
                <button type="button" class="btn secondary upload-trigger-btn">Upload</button>
            </div>
        </div>
    `;
}

function createTextarea(label, value, required = false) {
    const safeVal = value === undefined || value === null ? '' : String(value);
    const reqStar = required ? '<span class="req-star">*</span>' : '';
    const reqClass = required ? 'required-input' : '';
    return `
        <div class="form-group">
            <label>${label} ${reqStar}</label>
            <textarea class="data-input ${reqClass}">${safeVal}</textarea>
        </div>
    `;
}

function createArrayInput(label, arrValue, required = false) {
    const val = Array.isArray(arrValue) ? arrValue.join(', ') : '';
    const reqStar = required ? '<span class="req-star">*</span>' : '';
    const reqClass = required ? 'required-input' : '';
    return `
        <div class="form-group">
            <label>${label} (Comma separated) ${reqStar}</label>
            <input type="text" value="${val}" class="data-input ${reqClass}" placeholder="item1, item2, item3">
        </div>
    `;
}

// ---- Mantra Form ----
function renderMantraForm() {
    const html = `
        <div class="form-section meta-section">
            <div class="form-section-title">File Metadata</div>
            <div class="form-grid">
                ${createInput('ID', currentData.id, 'text', true)}
                ${createInput('Category', currentData.category, 'text', true)}
                ${createInput('Title (Hindi)', currentData.title?.hi, 'text', true)}
                ${createInput('Title (English)', currentData.title?.en, 'text', true)}
                ${createUploadInput('Image Filename', currentData.image, 'image')}
                ${createInput('Sort Order', currentData.sortOrder, 'number', true)}
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">
                Mantras 
                <button type="button" class="btn small outline" id="addMantraBtn">+ Add Mantra</button>
            </div>
            <div id="mantrasListContainer">
                ${currentData.mantras.map((m, index) => renderMantraCard(m, index)).join('')}
            </div>
        </div>
    `;
    formContainer.innerHTML = html;
    
    document.getElementById('addMantraBtn').addEventListener('click', () => {
        currentData.mantras.push({
            id: "", title: {hi: "", en: ""}, mantra: {hi: "", en: ""},
            description: {hi: "", en: ""}, meaning: {hi: "", en: ""},
            deities: [], keywords: {hi: [], en: []}, benefits: {hi: [], en: []},
            recommendedJapa: [], usage: {hi: "", en: ""}, pronunciation: {hi: "", en: ""}, audio: ""
        });
        renderForm();
        markUnsaved();
    });

    document.querySelectorAll('.delete-mantra-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(!confirm('Delete this mantra?')) return;
            const index = e.target.dataset.index;
            currentData.mantras.splice(index, 1);
            renderForm();
            markUnsaved();
        });
    });
}

function renderMantraCard(m, index) {
    return `
        <div class="array-card mantra-card" data-index="${index}">
            <div class="array-card-header">
                <h4>Mantra #${index + 1}</h4>
                <button type="button" class="btn icon-only danger delete-mantra-btn" data-index="${index}">🗑️</button>
            </div>
            <div class="form-grid">
                ${createInput('ID', m.id, 'text', true)}
                ${createUploadInput('Audio Filename', m.audio, 'audio')}
            </div>
            <div class="form-grid">
                ${createInput('Title (Hindi)', m.title?.hi, 'text', true)}
                ${createInput('Title (English)', m.title?.en, 'text', true)}
            </div>
            <div class="form-grid">
                ${createTextarea('Mantra Text (Hindi)', m.mantra?.hi, true)}
                ${createTextarea('Mantra Text (English)', m.mantra?.en, true)}
            </div>
            <div class="form-grid">
                ${createTextarea('Meaning (Hindi)', m.meaning?.hi, true)}
                ${createTextarea('Meaning (English)', m.meaning?.en, true)}
            </div>
            <div class="form-grid">
                ${createTextarea('Description (Hindi)', m.description?.hi, true)}
                ${createTextarea('Description (English)', m.description?.en, true)}
            </div>
            <div class="form-grid">
                ${createArrayInput('Keywords (Hindi)', m.keywords?.hi, true)}
                ${createArrayInput('Keywords (English)', m.keywords?.en, true)}
            </div>
            <div class="form-grid">
                ${createArrayInput('Benefits (Hindi)', m.benefits?.hi, true)}
                ${createArrayInput('Benefits (English)', m.benefits?.en, true)}
            </div>
            <div class="form-grid">
                ${createTextarea('Usage (Hindi)', m.usage?.hi, true)}
                ${createTextarea('Usage (English)', m.usage?.en, true)}
            </div>
            <div class="form-grid">
                ${createTextarea('Pronunciation (Hindi)', m.pronunciation?.hi, true)}
                ${createTextarea('Pronunciation (English)', m.pronunciation?.en, true)}
            </div>
            <div class="form-grid">
                ${createArrayInput('Deities', m.deities, true)}
                ${createArrayInput('Recommended Japa', m.recommendedJapa, true)}
            </div>
        </div>
    `;
}

// ---- Naam Form ----
function renderNaamForm() {
    const html = `
        <div class="form-section meta-section">
            <div class="form-section-title">File Metadata</div>
            <div class="form-grid">
                ${createInput('Category', currentData.category, 'text', true)}
                <div></div>
                ${createInput('Title (Hindi)', currentData.title?.hi, 'text', true)}
                ${createInput('Title (English)', currentData.title?.en, 'text', true)}
                ${createTextarea('Description (Hindi)', currentData.description?.hi, true)}
                ${createTextarea('Description (English)', currentData.description?.en, true)}
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">
                Names 
                <button type="button" class="btn small outline" id="addNaamBtn">+ Add Name</button>
            </div>
            <div id="naamsListContainer">
                ${currentData.names.map((n, index) => renderNaamCard(n, index)).join('')}
            </div>
        </div>
    `;
    formContainer.innerHTML = html;
    
    document.getElementById('addNaamBtn').addEventListener('click', () => {
        currentData.names.push({
            id: "", name: {hi: "", en: ""}, deity: "", isPopular: false
        });
        renderForm();
        markUnsaved();
    });

    document.querySelectorAll('.delete-naam-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(!confirm('Delete this name?')) return;
            const index = e.target.dataset.index;
            currentData.names.splice(index, 1);
            renderForm();
            markUnsaved();
        });
    });
}

function renderNaamCard(n, index) {
    return `
        <div class="array-card naam-card" data-index="${index}">
            <div class="array-card-header">
                <h4>Name #${index + 1}</h4>
                <button type="button" class="btn icon-only danger delete-naam-btn" data-index="${index}">🗑️</button>
            </div>
            <div class="form-grid">
                ${createInput('ID', n.id, 'text', true)}
                ${createInput('Deity', n.deity, 'text', true)}
                ${createInput('Name (Hindi)', n.name?.hi, 'text', true)}
                ${createInput('Name (English)', n.name?.en, 'text', true)}
            </div>
            <div class="checkbox-group">
                <input type="checkbox" class="is-popular-cb" ${n.isPopular ? 'checked' : ''}>
                <label>Is Popular?</label>
            </div>
        </div>
    `;
}


// ================= SERIALIZATION =================

function serializeForm() {
    if (!currentData) return null;
    let newData = JSON.parse(JSON.stringify(currentData)); // Deep copy structure
    
    const metaInputs = document.querySelectorAll('.meta-section .data-input');
    
    if (fileType === 'mantra') {
        newData.id = metaInputs[0].value;
        newData.category = metaInputs[1].value;
        newData.title.hi = metaInputs[2].value;
        newData.title.en = metaInputs[3].value;
        newData.image = metaInputs[4].value;
        newData.sortOrder = parseInt(metaInputs[5].value) || 1;

        const cards = document.querySelectorAll('.mantra-card');
        cards.forEach((card, index) => {
            const inputs = card.querySelectorAll('.data-input');
            const m = newData.mantras[index];
            m.id = inputs[0].value;
            m.audio = inputs[1].value;
            m.title.hi = inputs[2].value;
            m.title.en = inputs[3].value;
            m.mantra.hi = inputs[4].value;
            m.mantra.en = inputs[5].value;
            m.meaning.hi = inputs[6].value;
            m.meaning.en = inputs[7].value;
            m.description.hi = inputs[8].value;
            m.description.en = inputs[9].value;
            
            m.keywords.hi = inputs[10].value.split(',').map(s=>s.trim()).filter(Boolean);
            m.keywords.en = inputs[11].value.split(',').map(s=>s.trim()).filter(Boolean);
            m.benefits.hi = inputs[12].value.split(',').map(s=>s.trim()).filter(Boolean);
            m.benefits.en = inputs[13].value.split(',').map(s=>s.trim()).filter(Boolean);
            
            m.usage.hi = inputs[14].value;
            m.usage.en = inputs[15].value;
            m.pronunciation.hi = inputs[16].value;
            m.pronunciation.en = inputs[17].value;
            
            m.deities = inputs[18].value.split(',').map(s=>s.trim()).filter(Boolean);
            m.recommendedJapa = inputs[19].value.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n));
        });

    } else if (fileType === 'naam') {
        newData.category = metaInputs[0].value;
        newData.title.hi = metaInputs[1].value;
        newData.title.en = metaInputs[2].value;
        newData.description.hi = metaInputs[3].value;
        newData.description.en = metaInputs[4].value;

        const cards = document.querySelectorAll('.naam-card');
        cards.forEach((card, index) => {
            const inputs = card.querySelectorAll('.data-input');
            const cb = card.querySelector('.is-popular-cb');
            const n = newData.names[index];
            
            n.id = inputs[0].value;
            n.deity = inputs[1].value;
            n.name.hi = inputs[2].value;
            n.name.en = inputs[3].value;
            n.isPopular = cb.checked;
        });
    }

    return newData;
}


// Save File
async function saveFile() {
    if (!currentFilePath || !validateForm()) return;

    try {
        const contentObj = serializeForm();
        if(!contentObj) return;

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const res = await fetch('/api/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentFilePath, content: contentObj })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Update working data
        currentData = contentObj;
        isUnsaved = false;
        currentFileName.textContent = currentFilePath;
        showStatus('Saved successfully', 'success');
        
    } catch (err) {
        console.error(err);
        showStatus('Failed to save', 'error');
        saveBtn.disabled = false;
    } finally {
        if (!isUnsaved) saveBtn.textContent = 'Save Changes';
    }
}


// Event Listeners
refreshBtn.addEventListener('click', loadFiles);
saveBtn.addEventListener('click', saveFile);

// Keyboard shortcuts (Cmd+S / Ctrl+S)
window.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saveBtn.disabled) {
            saveFile();
        }
    }
});

// Modal Logic
newFileBtn.addEventListener('click', () => {
    newFileModal.classList.add('active');
    newFileName.focus();
});

cancelModalBtn.addEventListener('click', () => {
    newFileModal.classList.remove('active');
    newFileName.value = '';
    newFileSubfolder.value = '';
});

createFileBtn.addEventListener('click', async () => {
    const type = newFileType.value; // 'mantras' or 'naams'
    let subfolder = newFileSubfolder.value.trim();
    let name = newFileName.value.trim();

    if (!name) return alert('File name is required');
    if (!name.endsWith('.json')) name += '.json';

    let relativePath = type + '/';
    if (subfolder) {
        // Strip leading/trailing slashes
        subfolder = subfolder.replace(/^\/+|\/+$/g, '');
        relativePath += subfolder + '/';
    }
    relativePath += name;

    const baseTemplate = type === 'mantras' 
        ? { version: 1, id: name.replace('.json',''), category: "", title: { hi: "", en: "" }, image: "", sortOrder: 1, mantras: [] }
        : { version: 1, category: "", title: { hi: "", en: "" }, description: { hi: "", en: "" }, names: [] };

    try {
        const res = await fetch('/api/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content: baseTemplate })
        });
        
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        newFileModal.classList.remove('active');
        newFileName.value = '';
        newFileSubfolder.value = '';
        
        await loadFiles();
        
        // Automatically open the new file
        openFile(relativePath);
        showStatus('File created', 'success');
    } catch (err) {
        alert('Failed to create file: ' + err.message);
    }
});

// Utility to show temporary status message
function showStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = 'status-msg show ' + type;
    setTimeout(() => {
        saveStatus.classList.remove('show');
    }, 3000);
}
