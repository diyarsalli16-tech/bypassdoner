document.addEventListener('DOMContentLoaded', () => {
  // Ad Modal Logic
  const adOverlay = document.getElementById('ad-overlay');
  const skipAdBtn = document.getElementById('skip-ad-btn');
  let adTimer = 5;

  const adInterval = setInterval(() => {
    adTimer--;
    if (adTimer > 0) {
      skipAdBtn.textContent = `Reklamı Geç (${adTimer})`;
    } else {
      clearInterval(adInterval);
      skipAdBtn.textContent = 'Reklamı Geç';
      skipAdBtn.disabled = false;
    }
  }, 1000);

  skipAdBtn.addEventListener('click', () => {
    adOverlay.classList.add('hidden');
  });

  // UI Sections
  const uploadSection = document.getElementById('upload-section');
  const progressSection = document.getElementById('progress-section');
  const successSection = document.getElementById('success-section');

  // Drag and Drop Logic
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');

  // Progress Elements
  const fileNameDisplay = document.getElementById('file-name');
  const fileSizeDisplay = document.getElementById('file-size');
  const progressBar = document.getElementById('progress-bar');
  const uploadSpeedDisplay = document.getElementById('upload-speed');
  const uploadPercentageDisplay = document.getElementById('upload-percentage');
  const timeLeftDisplay = document.getElementById('time-left');

  // Success Elements
  const shareLinkInput = document.getElementById('share-link');
  const copyBtn = document.getElementById('copy-btn');
  const newUploadBtn = document.getElementById('new-upload-btn');

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
  });

  // Handle drop
  dropZone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) handleFiles(files);
  }

  // Handle Browse click
  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', function() {
    if (this.files.length) handleFiles(this.files);
  });

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function handleFiles(files) {
    const file = files[0]; // Process first file for simplicity
    
    uploadSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    uploadFileRealTime(file);
  }

  function uploadFileRealTime(file) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressBar.style.width = percentComplete + '%';
        uploadPercentageDisplay.textContent = Math.floor(percentComplete) + '%';

        const currentTime = Date.now();
        const timeDiff = (currentTime - startTime) / 1000; // in seconds
        
        if (timeDiff > 0.5) {
          const bytesUploadedInInterval = e.loaded - lastLoaded;
          const speedBps = bytesUploadedInInterval / timeDiff;
          const speedMBps = (speedBps / (1024 * 1024)).toFixed(1);
          uploadSpeedDisplay.textContent = speedMBps + ' MB/s';

          const bytesRemaining = e.total - e.loaded;
          const secondsRemaining = Math.max(0, bytesRemaining / speedBps);

          if (secondsRemaining < 1) {
            timeLeftDisplay.textContent = 'Tamamlanıyor...';
          } else if (secondsRemaining < 60) {
            timeLeftDisplay.textContent = Math.ceil(secondsRemaining) + ' sn kaldı';
          } else {
            timeLeftDisplay.textContent = Math.ceil(secondsRemaining / 60) + ' dk kaldı';
          }

          startTime = currentTime;
          lastLoaded = e.loaded;
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        showSuccess(response.fileUrl);
        loadCommunityFiles(); // refresh list
      } else {
        alert('Yükleme hatası: ' + xhr.statusText);
        resetUploadUI();
      }
    });

    xhr.addEventListener('error', () => {
      alert('Yükleme sırasında ağ hatası oluştu!');
      resetUploadUI();
    });

    // Simulate small delay for small files to show progress UI
    setTimeout(() => {
      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    }, 500);
  }

  function showSuccess(fileUrl) {
    progressSection.classList.add('hidden');
    successSection.classList.remove('hidden');
    
    // Create absolute URL
    const fullUrl = window.location.origin + fileUrl;
    shareLinkInput.value = fullUrl;
  }

  function resetUploadUI() {
    successSection.classList.add('hidden');
    progressSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    fileInput.value = '';
  }

  // Copy Link
  copyBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    
    const originalHtml = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => {
      copyBtn.innerHTML = originalHtml;
    }, 2000);
  });

  // Reset for new upload
  newUploadBtn.addEventListener('click', resetUploadUI);

  // --- Community Files Feature ---
  const filesListContainer = document.getElementById('files-list');

  function loadCommunityFiles() {
    fetch('/api/files')
      .then(res => res.json())
      .then(files => {
        if (files.length === 0) {
          filesListContainer.innerHTML = '<div class="loading-files">Henüz dosya yüklenmedi. İlk yükleyen sen ol!</div>';
          return;
        }

        filesListContainer.innerHTML = ''; // clear

        files.forEach(file => {
          const fileCard = document.createElement('div');
          fileCard.className = 'file-card';
          
          const date = new Date(file.date).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          });

          fileCard.innerHTML = `
            <div class="file-card-info">
              <div class="file-card-icon"><i class="fa-solid fa-file"></i></div>
              <div>
                <div class="file-card-name">${file.filename}</div>
                <div class="file-card-meta">${formatBytes(file.size)} • ${date}</div>
              </div>
            </div>
            <a href="${file.url}" target="_blank" download class="file-card-download" title="İndir">
              <i class="fa-solid fa-download"></i>
            </a>
          `;
          filesListContainer.appendChild(fileCard);
        });
      })
      .catch(err => {
        filesListContainer.innerHTML = '<div class="loading-files">Dosyalar yüklenirken hata oluştu.</div>';
      });
  }

  // Load files on start
  loadCommunityFiles();
});
