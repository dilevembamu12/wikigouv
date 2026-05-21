(function () {
  var form = document.getElementById('categoryForm');
  if (!form) return;

  var titleInput = document.getElementById('categoryTitle');
  var slugInput = document.getElementById('categorySlug');
  var hasSub = document.getElementById('hasSubCategory');
  var subSection = document.getElementById('subCategoriesSection');
  var list = document.getElementById('subCategoriesList');
  var tpl = document.getElementById('subCategoryTemplate');
  var addBtn = document.getElementById('addSubCategoryBtn');
  var slugTouched = !!(slugInput && slugInput.value);

  function slugify(v) {
    return (v || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function newKey() {
    return 'new_' + Math.random().toString(36).slice(2, 10);
  }

  function openLibraryPicker(onSelect) {
    var selectionHandler = function (event) {
      if (event.origin !== window.location.origin) return;
      var payload = event.data || {};
      if (payload.type !== 'LIBRARY_FILE_SELECTED') return;
      window.removeEventListener('message', selectionHandler);
      if (payload.key) onSelect(String(payload.key));
    };
    window.addEventListener('message', selectionHandler);
    window.open(
      '/admin/library?picker=1&target=category-field&folder=icons',
      'libraryPicker',
      'width=1200,height=800'
    );
  }

  function bindSubRow(row) {
    var removeBtn = row.querySelector('.js-remove-sub');
    var title = row.querySelector('.js-sub-title') || row.querySelector('input[name*="[title]"]');
    var slug = row.querySelector('.js-sub-slug');
    var iconInput = row.querySelector('.js-sub-icon') || row.querySelector('input[name*="[icon]"]');
    var libraryBtn = row.querySelector('.js-open-library-sub');
    var localFile = row.querySelector('.js-local-file-sub');

    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        row.remove();
      });
    }

    if (title && slug) {
      var localTouched = !!slug.value;
      slug.addEventListener('input', function () { localTouched = true; });
      title.addEventListener('input', function () {
        if (!localTouched) slug.value = slugify(title.value);
      });
    }

    row.addEventListener('dragstart', function () { row.classList.add('dragging'); });
    row.addEventListener('dragend', function () { row.classList.remove('dragging'); });

    if (localFile && iconInput) {
      localFile.addEventListener('change', function () {
        if (localFile.files && localFile.files[0]) {
          iconInput.value = 'local://' + localFile.files[0].name;
        }
      });
    }

    if (libraryBtn && iconInput) {
      libraryBtn.addEventListener('click', function () {
        openLibraryPicker(function (value) { iconInput.value = value; });
      });
    }
  }

  function normalizeSubNames() {
    if (!list) return;
    list.querySelectorAll('.js-sub-row').forEach(function (row) {
      var key = row.getAttribute('data-key');
      var title = row.querySelector('.js-sub-title') || row.querySelector('input[name*="[title]"]');
      var slug = row.querySelector('.js-sub-slug');
      var icon = row.querySelector('.js-sub-icon') || row.querySelector('input[name*="[icon]"]');
      if (title) title.name = 'sub_categories[' + key + '][title]';
      if (slug) slug.name = 'sub_categories[' + key + '][slug]';
      if (icon) icon.name = 'sub_categories[' + key + '][icon]';
    });
  }

  if (titleInput && slugInput) {
    slugInput.addEventListener('input', function () { slugTouched = true; });
    titleInput.addEventListener('input', function () {
      if (!slugTouched) slugInput.value = slugify(titleInput.value);
    });
  }

  document.querySelectorAll('.js-local-file').forEach(function (el) {
    var targetId = el.getAttribute('data-target');
    var target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    el.addEventListener('change', function () {
      if (el.files && el.files[0]) target.value = 'local://' + el.files[0].name;
    });
  });

  document.querySelectorAll('.js-open-library').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-target');
      var target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      openLibraryPicker(function (value) { target.value = value; });
    });
  });

  if (hasSub && subSection) {
    hasSub.addEventListener('change', function () {
      subSection.classList.toggle('d-none', !hasSub.checked);
    });
  }

  if (addBtn && list && tpl) {
    addBtn.addEventListener('click', function () {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.setAttribute('data-key', newKey());
      bindSubRow(node);
      list.appendChild(node);
      if (hasSub) hasSub.checked = true;
      if (subSection) subSection.classList.remove('d-none');
      normalizeSubNames();
    });
  }

  if (list) {
    list.querySelectorAll('.js-sub-row').forEach(function (row) {
      if (!row.getAttribute('data-key')) {
        var titleInputInRow = row.querySelector('input[name*="sub_categories["]');
        var m = titleInputInRow && titleInputInRow.name.match(/sub_categories\[([^\]]+)\]/);
        row.setAttribute('data-key', m ? m[1] : newKey());
      }
      bindSubRow(row);
    });

    list.addEventListener('dragover', function (event) {
      event.preventDefault();
      var dragging = list.querySelector('.dragging');
      if (!dragging) return;
      var after = Array.from(list.querySelectorAll('.js-sub-row:not(.dragging)')).find(function (el) {
        var rect = el.getBoundingClientRect();
        return event.clientY <= rect.top + rect.height / 2;
      });
      if (after) list.insertBefore(dragging, after);
      else list.appendChild(dragging);
    });
  }

  form.addEventListener('submit', function (event) {
    if (hasSub && list && list.querySelectorAll('.js-sub-row').length > 0) {
      hasSub.checked = true;
    }
    normalizeSubNames();
    if (!titleInput || titleInput.value.trim()) return;
    event.preventDefault();
    if (typeof window.Swal !== 'undefined') {
      window.Swal.fire({ icon: 'warning', title: 'Title is required' });
    }
  });
})();
