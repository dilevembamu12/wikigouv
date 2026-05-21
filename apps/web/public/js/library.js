(function () {
  var folderInput = document.getElementById('libraryFolder');
  var searchInput = document.getElementById('librarySearch');
  var reloadBtn = document.getElementById('libraryReload');
  var uploadInput = document.getElementById('libraryUploadInput');
  var newFolderBtn = document.getElementById('libraryNewFolder');
  var bulkMoveBtn = document.getElementById('bulkMoveBtn');
  var bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  var rows = document.getElementById('libraryRows');
  var state = document.getElementById('libraryState');
  var foldersNav = document.getElementById('libraryFoldersNav');
  var listWrap = document.getElementById('libraryListWrap');
  var thumbsWrap = document.getElementById('libraryThumbsWrap');
  var breadcrumb = document.getElementById('libraryBreadcrumb');
  var contextMenu = document.getElementById('libraryContextMenu');
  var toggleThumbs = document.getElementById('toggleThumbs');
  var toggleList = document.getElementById('toggleList');
  var toggleSort = document.getElementById('toggleSort');
  var quickAdd = document.getElementById('libraryQuickAdd');
  var configEl = document.getElementById('libraryPageConfig');
  if (!folderInput || !rows || !state || !configEl || !thumbsWrap || !listWrap) return;

  var pickerMode = configEl.getAttribute('data-picker') === '1';
  var pickerTarget = configEl.getAttribute('data-target') || '';
  var sortAsc = false;
  var selected = new Set();

  function formatSize(size) {
    var n = Number(size || 0);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function showError(message) {
    state.textContent = message;
    if (window.Swal) window.Swal.fire({ icon: 'error', title: 'Library', text: message });
  }
  function parseJsonOrThrow(response) {
    if (!response.ok) throw new Error('status_' + response.status);
    return response.json();
  }
  function sendPickerValue(key) {
    if (!pickerMode) return;
    if (window.opener && typeof window.opener.postMessage === 'function') {
      window.opener.postMessage({ type: 'LIBRARY_FILE_SELECTED', target: pickerTarget, key: key }, window.location.origin);
      window.close();
    }
  }
  function buildBreadcrumb(path) {
    if (!breadcrumb) return;
    var segs = path ? path.split('/') : [];
    var html = '<a href="#" data-path="">root</a>';
    var acc = '';
    segs.forEach(function (s) {
      acc = acc ? acc + '/' + s : s;
      html += ' / <a href="#" data-path="' + acc + '">' + s + '</a>';
    });
    breadcrumb.innerHTML = html;
    breadcrumb.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        folderInput.value = a.getAttribute('data-path') || '';
        loadItems();
      });
    });
  }
  function renderFoldersSidebar(path, folders) {
    if (!foldersNav) return;
    foldersNav.innerHTML = '';
    var root = document.createElement('a');
    root.href = '#'; root.className = 'library-folder-item ' + (path ? '' : 'active');
    root.innerHTML = '<i class="fa fa-folder me-2"></i>root';
    root.onclick = function (e) { e.preventDefault(); folderInput.value = ''; loadItems(); };
    foldersNav.appendChild(root);
    folders.forEach(function (f) {
      var a = document.createElement('a');
      a.href = '#'; a.className = 'library-folder-item'; a.innerHTML = '<i class="fa fa-folder me-2"></i>' + f;
      a.onclick = function (e) { e.preventDefault(); folderInput.value = path ? (path + '/' + f) : f; loadItems(); };
      foldersNav.appendChild(a);
    });
  }
  function hideContext() {
    if (!contextMenu) return;
    contextMenu.classList.add('d-none');
    contextMenu.innerHTML = '';
  }
  function showContext(item, x, y) {
    if (!contextMenu) return;
    contextMenu.classList.remove('d-none');
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.innerHTML =
      '<button data-a="preview">Preview</button>' +
      (pickerMode ? '<button data-a="select">Select</button>' : '') +
      '<button data-a="rename">Rename</button>' +
      '<button data-a="move">Move</button>' +
      '<button data-a="delete">Delete</button>';
    contextMenu.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        hideContext();
        handleAction(b.getAttribute('data-a'), item);
      };
    });
  }
  async function handleAction(action, item) {
    if (action === 'preview') return window.open(item.previewUrl, '_blank');
    if (action === 'select') return sendPickerValue(item.key);
    if (action === 'rename') {
      var res = await window.Swal.fire({ title: 'Rename file', input: 'text', inputValue: item.key.split('/').pop() || '', showCancelButton: true });
      if (!res.isConfirmed || !res.value) return;
      return fetch('/admin/library/rename', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: item.key, name: res.value }) }).then(parseJsonOrThrow).then(loadItems);
    }
    if (action === 'move') {
      var mv = await window.Swal.fire({ title: 'Move file', input: 'text', inputValue: folderInput.value || '', showCancelButton: true });
      if (!mv.isConfirmed || !mv.value) return;
      return fetch('/admin/library/move', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: item.key, folder: mv.value }) }).then(parseJsonOrThrow).then(loadItems);
    }
    if (action === 'delete') {
      var conf = await window.Swal.fire({ icon: 'warning', title: 'Delete this file?', showCancelButton: true });
      if (!conf.isConfirmed) return;
      return fetch('/admin/library/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: item.key }) }).then(parseJsonOrThrow).then(loadItems);
    }
  }
  function renderItems(files, folders, parentFolder) {
    rows.innerHTML = '';
    thumbsWrap.innerHTML = '';
    if (parentFolder) {
      var up = document.createElement('tr');
      up.innerHTML = '<td colspan="6"><button class="btn btn-sm btn-link text-decoration-none"><i class="fa fa-arrow-left me-1"></i>.. (parent folder)</button></td>';
      up.querySelector('button').onclick = function () { folderInput.value = parentFolder; loadItems(); };
      rows.appendChild(up);
    }
    folders.forEach(function (folderName) {
      var trf = document.createElement('tr');
      trf.innerHTML = '<td></td><td><i class="fa fa-folder text-warning me-2"></i>' + folderName + '</td><td>folder</td><td>-</td><td>-</td><td class="text-end"><button class="btn btn-sm btn-outline-primary">Open</button></td>';
      trf.querySelector('button').onclick = function () { folderInput.value = folderInput.value ? folderInput.value + '/' + folderName : folderName; loadItems(); };
      rows.appendChild(trf);
    });
    if (!files.length && !folders.length) { state.textContent = 'No files found.'; return; }
    state.textContent = files.length + ' file(s), ' + folders.length + ' folder(s), selected: ' + selected.size;

    files.forEach(function (item) {
      var checked = selected.has(item.key) ? 'checked' : '';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><input type="checkbox" class="js-select" ' + checked + '></td>' +
        '<td>' + item.key + '</td><td>' + item.type + '</td><td>' + formatSize(item.size) + '</td><td>' + (item.lastModified ? new Date(item.lastModified).toLocaleString() : '-') + '</td>' +
        '<td class="text-end"><button class="btn btn-sm btn-outline-primary me-1 js-preview">Preview</button>' + (pickerMode ? '<button class="btn btn-sm btn-success me-1 js-select-btn">Select</button>' : '') + '<button class="btn btn-sm btn-outline-secondary me-1 js-rename">Rename</button><button class="btn btn-sm btn-outline-warning me-1 js-move">Move</button><button class="btn btn-sm btn-outline-danger js-delete">Delete</button></td>';
      tr.querySelector('.js-select').onchange = function (e) { if (e.target.checked) selected.add(item.key); else selected.delete(item.key); state.textContent = files.length + ' file(s), ' + folders.length + ' folder(s), selected: ' + selected.size; };
      tr.querySelector('.js-preview').onclick = function () { handleAction('preview', item); };
      if (pickerMode) tr.querySelector('.js-select-btn').onclick = function () { handleAction('select', item); };
      tr.querySelector('.js-rename').onclick = function () { handleAction('rename', item); };
      tr.querySelector('.js-move').onclick = function () { handleAction('move', item); };
      tr.querySelector('.js-delete').onclick = function () { handleAction('delete', item); };
      tr.oncontextmenu = function (e) { e.preventDefault(); showContext(item, e.clientX, e.clientY); };
      rows.appendChild(tr);

      var card = document.createElement('div');
      card.className = 'library-thumb-card';
      card.innerHTML = '<div class="library-thumb-media">' + (item.type === 'image' ? '<img src="' + item.previewUrl + '" alt="">' : '<i class="fa fa-file fa-2x text-secondary"></i>') + '</div><div class="small fw-semibold text-truncate" title="' + item.key + '">' + item.key.split('/').pop() + '</div><div class="small text-muted">' + formatSize(item.size) + '</div>';
      card.oncontextmenu = function (e) { e.preventDefault(); showContext(item, e.clientX, e.clientY); };
      card.onclick = function () { if (pickerMode) sendPickerValue(item.key); };
      thumbsWrap.appendChild(card);
    });
  }
  function loadItems() {
    hideContext();
    state.textContent = 'Loading...';
    var qs = '?folder=' + encodeURIComponent(folderInput.value || '') + '&q=' + encodeURIComponent(searchInput ? searchInput.value : '') + '&page=1&pageSize=80';
    fetch('/admin/library/items' + qs).then(parseJsonOrThrow).then(function (data) {
      var files = (data.files || []).slice();
      files.sort(sortAsc ? function (a, b) { return String(a.key).localeCompare(String(b.key)); } : function (a, b) { return String(b.lastModified).localeCompare(String(a.lastModified)); });
      buildBreadcrumb(String(data.folder || ''));
      renderFoldersSidebar(String(data.folder || ''), data.folders || []);
      renderItems(files, data.folders || [], String(data.parentFolder || ''));
    }).catch(function (err) { showError(String(err.message).includes('status_403') ? 'Access denied for this action.' : 'Unable to load library items.'); });
  }

  async function bulkDelete() {
    if (!selected.size) return;
    var conf = await window.Swal.fire({ icon: 'warning', title: 'Delete selected files?', text: selected.size + ' item(s)', showCancelButton: true });
    if (!conf.isConfirmed) return;
    await Promise.all(Array.from(selected).map(function (k) {
      return fetch('/admin/library/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: k }) });
    }));
    selected.clear();
    loadItems();
  }
  async function bulkMove() {
    if (!selected.size) return;
    var res = await window.Swal.fire({ title: 'Move selected files', input: 'text', inputValue: folderInput.value || '', showCancelButton: true });
    if (!res.isConfirmed || !res.value) return;
    await Promise.all(Array.from(selected).map(function (k) {
      return fetch('/admin/library/move', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: k, folder: res.value }) });
    }));
    selected.clear();
    loadItems();
  }

  if (reloadBtn) reloadBtn.onclick = loadItems;
  if (toggleThumbs) toggleThumbs.onclick = function () { listWrap.classList.add('d-none'); thumbsWrap.classList.remove('d-none'); };
  if (toggleList) toggleList.onclick = function () { thumbsWrap.classList.add('d-none'); listWrap.classList.remove('d-none'); };
  if (toggleSort) toggleSort.onclick = function () { sortAsc = !sortAsc; loadItems(); };
  if (searchInput) searchInput.onkeydown = function (e) { if (e.key === 'Enter') loadItems(); };
  if (newFolderBtn) newFolderBtn.onclick = async function () {
    var res = await window.Swal.fire({ title: 'New folder', input: 'text', showCancelButton: true });
    if (!res.isConfirmed || !res.value) return;
    fetch('/admin/library/folder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ folder: folderInput.value || '', name: res.value }) }).then(parseJsonOrThrow).then(loadItems).catch(function () { showError('Folder creation failed'); });
  };
  if (bulkDeleteBtn) bulkDeleteBtn.onclick = bulkDelete;
  if (bulkMoveBtn) bulkMoveBtn.onclick = bulkMove;
  if (quickAdd) quickAdd.onclick = function () { if (uploadInput) uploadInput.click(); };
  if (uploadInput) uploadInput.onchange = function () {
    var file = uploadInput.files && uploadInput.files[0];
    if (!file) return;
    var form = new FormData();
    form.append('file', file);
    form.append('folder', folderInput.value || '');
    fetch('/admin/library/upload', { method: 'POST', body: form }).then(parseJsonOrThrow).then(loadItems).catch(function (err) { showError(String(err.message).includes('status_403') ? 'Access denied for upload.' : 'Upload failed'); });
  };

  document.addEventListener('click', hideContext);
  ;['dragenter', 'dragover'].forEach(function (n) {
    listWrap.addEventListener(n, function (e) { e.preventDefault(); e.stopPropagation(); listWrap.classList.add('library-dropzone'); });
  });
  ;['dragleave', 'drop'].forEach(function (n) {
    listWrap.addEventListener(n, function (e) { e.preventDefault(); e.stopPropagation(); listWrap.classList.remove('library-dropzone'); });
  });
  listWrap.addEventListener('drop', function (e) {
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    var form = new FormData();
    form.append('file', file);
    form.append('folder', folderInput.value || '');
    fetch('/admin/library/upload', { method: 'POST', body: form }).then(parseJsonOrThrow).then(loadItems).catch(function () { showError('Upload failed'); });
  });

  loadItems();
})();

