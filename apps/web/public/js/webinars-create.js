(function () {
  var form = document.querySelector('form[action="/admin/webinars/create"], form[action^="/admin/webinars/"][action$="/edit/course"]');
  var sourceSelect = document.querySelector('.js-video-demo-source');
  var pathGroup = document.querySelector('.js-video-demo-path-group');
  var fileGroup = document.querySelector('.js-video-demo-file-group');
  var minioGroup = document.querySelector('.js-video-demo-minio-group');
  var titleInput = document.getElementById('courseTitleInput');
  var slugInput = document.getElementById('courseSlugInput');
  var categoryInput = document.getElementById('courseCategoryInput');
  var categoryIdInput = document.getElementById('courseCategoryIdInput');
  var categoryFiltersWrap = document.getElementById('categoryFiltersWrap');
  var subcategoriesWrap = document.getElementById('courseSubcategoriesWrap');
  var categoriesDataNode = document.getElementById('courseCategoriesData');
  var teacherIdSelect = document.getElementById('teacherIdSelect');
  var instructorNameInput = document.getElementById('instructorNameInput');
  var draftInput = document.getElementById('forDraft');
  var saveAsDraftBtn = document.getElementById('saveAsDraftBtn');
  var saveAndContinueBtn = document.getElementById('saveAndContinueBtn');
  var formAction = form ? String(form.getAttribute('action') || '') : '';
  var isEditMode = /\/admin\/webinars\/[^/]+\/edit\/course$/i.test(formAction);
  var webinarIdMatch = formAction.match(/\/admin\/webinars\/([^/]+)\/edit\/course$/i);
  var webinarId = webinarIdMatch ? decodeURIComponent(webinarIdMatch[1]) : 'create';
  var storageKey = isEditMode
    ? ('wikigouv:webinars:edit:form:' + webinarId)
    : 'wikigouv:webinars:create:form';
  var userEditedSlug = false;
  var categoriesTree = [];
  var selectedSubCategoriesInput = document.getElementById('subCategoriesSerializedInput');
  var selectedCategoryFiltersInput = document.getElementById('categoryFiltersSerializedInput');

  if (!sourceSelect || !pathGroup || !fileGroup || !minioGroup || !form) return;

  if (categoriesDataNode) {
    try {
      categoriesTree = JSON.parse(decodeURIComponent(categoriesDataNode.getAttribute('data-json') || '[]'));
    } catch (_) {
      categoriesTree = [];
    }
  }

  function slugify(value) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function toggleVideoDemoSourceFields() {
    var source = sourceSelect.value;
    var isUpload = source === 'upload' || source === 's3';
    var isMinio = source === 'minio_internal';
    var pathInput = pathGroup.querySelector('input[name="videoDemo"]');
    var fileInput = fileGroup.querySelector('input[name="videoDemoFile"]');
    var minioBucket = minioGroup.querySelector('input[name="videoDemoMinioBucket"]');
    var minioKey = minioGroup.querySelector('input[name="videoDemoMinioKey"]');

    pathGroup.classList.toggle('d-none', isUpload || isMinio);
    fileGroup.classList.toggle('d-none', !isUpload);
    minioGroup.classList.toggle('d-none', !isMinio);

    if (pathInput) pathInput.required = !isUpload && !isMinio;
    if (fileInput) fileInput.required = isUpload;
    if (minioBucket) minioBucket.required = isMinio;
    if (minioKey) minioKey.required = isMinio;
  }

  function syncInstructorLabel() {
    if (!teacherIdSelect || !instructorNameInput) return;
    var opt = teacherIdSelect.options[teacherIdSelect.selectedIndex];
    var name = opt ? (opt.getAttribute('data-name') || '').trim() : '';
    instructorNameInput.value = name;
  }

  function renderCategoryFilters(groups) {
    if (!categoryFiltersWrap) return;
    var safeGroups = Array.isArray(groups) ? groups : [];
    if (!safeGroups.length) {
      categoryFiltersWrap.classList.add('d-none');
      categoryFiltersWrap.innerHTML = '';
      return;
    }

    var html = safeGroups.map(function (group) {
      var optionsHtml = (group.options || []).map(function (opt) {
        var value = encodeURIComponent(group.key + ':' + opt.label);
        var id = 'filter_' + opt.id;
        return (
          '<div class="form-check mb-2">' +
            '<input class="form-check-input" type="checkbox" name="categoryFilters" value="' + value + '" id="' + id + '">' +
            '<label class="form-check-label" for="' + id + '">' + opt.label + '</label>' +
          '</div>'
        );
      }).join('');
      return (
        '<div class="col-md-4">' +
          '<div class="border rounded p-3 h-100">' +
            '<div class="fw-semibold mb-2">' + group.label + '</div>' +
            optionsHtml +
          '</div>' +
        '</div>'
      );
    }).join('');

    categoryFiltersWrap.innerHTML = html;
    categoryFiltersWrap.classList.remove('d-none');

    var preSelected = String((selectedCategoryFiltersInput && selectedCategoryFiltersInput.value) || '')
      .split(',')
      .map(function (v) { return v.trim(); })
      .filter(Boolean);
    if (preSelected.length) {
      Array.prototype.slice.call(categoryFiltersWrap.querySelectorAll('input[name="categoryFilters"]')).forEach(function (el) {
        var raw = String(el.value || '');
        var decoded = raw;
        try { decoded = decodeURIComponent(raw); } catch (_) {}
        if (preSelected.indexOf(decoded) >= 0 || preSelected.indexOf(raw) >= 0) {
          el.checked = true;
        }
      });
    }
  }

  function renderSubcategories(selectedCategoryId) {
    if (!subcategoriesWrap) return;
    var root = (categoriesTree || []).find(function (cat) { return String(cat.id) === String(selectedCategoryId); });
    var subCategories = root && Array.isArray(root.subCategories) ? root.subCategories : [];
    if (!subCategories.length) {
      subcategoriesWrap.classList.add('d-none');
      subcategoriesWrap.innerHTML = '';
      return;
    }
    var html = subCategories.map(function (sub) {
      var id = 'courseSub_' + String(sub.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      return (
        '<div class="form-check mb-2">' +
          '<input class="form-check-input" type="checkbox" name="subCategoryIds" value="' + sub.id + '" id="' + id + '">' +
          '<label class="form-check-label" for="' + id + '">' + sub.name + '</label>' +
        '</div>'
      );
    }).join('');
    subcategoriesWrap.innerHTML = html;
    subcategoriesWrap.classList.remove('d-none');

    var preSelected = String((selectedSubCategoriesInput && selectedSubCategoriesInput.value) || '')
      .split(',')
      .map(function (v) { return v.trim(); })
      .filter(Boolean);
    if (preSelected.length) {
      Array.prototype.slice.call(subcategoriesWrap.querySelectorAll('input[name="subCategoryIds"]')).forEach(function (el) {
        if (preSelected.indexOf(String(el.value || '').trim()) >= 0) {
          el.checked = true;
        }
      });
    }
  }

  function loadCategoryFilters() {
    if (!categoryInput) return;
    var selected = categoryInput.options[categoryInput.selectedIndex];
    var categoryId = selected ? (selected.getAttribute('data-category-id') || '') : '';
    if (categoryIdInput) categoryIdInput.value = categoryId;
    renderSubcategories(categoryId);
    if (!categoryId) {
      renderCategoryFilters([]);
      return;
    }
    fetch('/admin/webinars/category-filters?categoryId=' + encodeURIComponent(categoryId))
      .then(function (r) { return r.json(); })
      .then(function (data) { renderCategoryFilters(data.groups || []); })
      .catch(function () { renderCategoryFilters([]); });
  }

  function serializeFormState() {
    var payload = {};
    Array.prototype.slice.call(form.elements).forEach(function (el) {
      if (!el || !el.name || el.disabled) return;
      var tag = (el.tagName || '').toLowerCase();
      var type = String(el.type || '').toLowerCase();
      if (type === 'file') return;
      if ((type === 'checkbox' || type === 'radio') && !el.checked) return;

      if (payload[el.name] === undefined) {
        payload[el.name] = el.value;
      } else if (Array.isArray(payload[el.name])) {
        payload[el.name].push(el.value);
      } else {
        payload[el.name] = [payload[el.name], el.value];
      }

      if (tag === 'select' && el.multiple) {
        payload[el.name] = Array.prototype.slice.call(el.selectedOptions).map(function (opt) { return opt.value; });
      }
    });
    return payload;
  }

  function persistFormState() {
    try {
      var payload = serializeFormState();
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_) {}
  }

  function restoreFormState() {
    var params = new URLSearchParams(window.location.search || '');
    if (!params.has('error')) return;
    var raw = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch (_) {
      raw = null;
    }
    if (!raw) return;
    var payload = null;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      payload = null;
    }
    if (!payload || typeof payload !== 'object') return;

    Object.keys(payload).forEach(function (name) {
      var value = payload[name];
      var fields = form.querySelectorAll('[name="' + name.replace(/"/g, '\\"') + '"]');
      if (!fields.length) return;
      var first = fields[0];
      var type = String(first.type || '').toLowerCase();

      if (type === 'checkbox' || type === 'radio') {
        var values = Array.isArray(value) ? value.map(String) : [String(value)];
        Array.prototype.slice.call(fields).forEach(function (f) {
          f.checked = values.indexOf(String(f.value)) >= 0;
        });
        return;
      }

      if (Array.isArray(value) && first.tagName && String(first.tagName).toLowerCase() === 'select' && first.multiple) {
        var map = value.map(String);
        Array.prototype.slice.call(first.options || []).forEach(function (opt) {
          opt.selected = map.indexOf(String(opt.value)) >= 0;
        });
        return;
      }

      first.value = String(Array.isArray(value) ? value[0] : value);
    });

    if (categoryInput) loadCategoryFilters();
    if (teacherIdSelect) syncInstructorLabel();
  }

  if (slugInput) {
    slugInput.addEventListener('input', function () {
      userEditedSlug = true;
    });
  }

  if (titleInput && slugInput) {
    titleInput.addEventListener('input', function () {
      if (!userEditedSlug) slugInput.value = slugify(titleInput.value);
    });
    if (!isEditMode || !String(slugInput.value || '').trim()) {
      titleInput.dispatchEvent(new Event('input'));
    }
  }

  restoreFormState();

  if (teacherIdSelect) {
    teacherIdSelect.addEventListener('change', syncInstructorLabel);
    syncInstructorLabel();
  }

  if (categoryInput) {
    categoryInput.addEventListener('change', loadCategoryFilters);
    loadCategoryFilters();
  }

  if (saveAsDraftBtn && draftInput) {
    saveAsDraftBtn.addEventListener('click', function () {
      draftInput.value = 'yes';
    });
  }
  if (saveAndContinueBtn && draftInput) {
    saveAndContinueBtn.addEventListener('click', function () {
      draftInput.value = 'no';
    });
  }

  document.querySelectorAll('.js-file-local').forEach(function (inputEl) {
    inputEl.addEventListener('change', function () {
      var target = inputEl.getAttribute('data-target');
      var field = document.querySelector('input[name="' + target + '"]');
      if (!field) return;
      if (inputEl.files && inputEl.files[0]) {
        field.value = 'local://' + inputEl.files[0].name;
      }
    });
  });

  document.querySelectorAll('.js-open-library').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-target');
      var field = document.querySelector('input[name="' + target + '"]');
      if (!field) return;
      var selectionHandler = function (event) {
        if (event.origin !== window.location.origin) return;
        var payload = event.data || {};
        if (payload.type !== 'LIBRARY_FILE_SELECTED') return;
        window.removeEventListener('message', selectionHandler);
        if (payload.key) field.value = String(payload.key);
      };
      window.addEventListener('message', selectionHandler);
      window.open(
        '/admin/library?picker=1&target=webinar-field&folder=',
        'libraryPicker',
        'width=1300,height=850'
      );
    });
  });

  form.addEventListener('submit', function (event) {
    var missingCategory = !categoryInput || !categoryInput.value || !categoryInput.value.trim();
    if (!missingCategory) return;
    event.preventDefault();
    if (window.Swal && typeof window.Swal.fire === 'function') {
      window.Swal.fire({
        icon: 'warning',
        title: 'Categorie requise',
        text: 'Aucune categorie selectionnee. Voulez-vous creer une categorie maintenant ?',
        showCancelButton: true,
        confirmButtonText: 'Creer une categorie',
        cancelButtonText: 'Rester sur ce formulaire'
      }).then(function (result) {
        if (result.isConfirmed) {
          window.location.href = '/admin/categories/create';
        }
      });
      return;
    }
    var shouldGo = window.confirm('Aucune categorie selectionnee. Ouvrir la page de creation de categorie ?');
    if (shouldGo) window.location.href = '/admin/categories/create';
  });

  sourceSelect.addEventListener('change', toggleVideoDemoSourceFields);
  toggleVideoDemoSourceFields();

  form.addEventListener('submit', function () {
    persistFormState();
    var selectedFilters = Array.prototype.slice.call(document.querySelectorAll('input[name="categoryFilters"]:checked'))
      .map(function (el) {
        var raw = String(el.value || '');
        try { return decodeURIComponent(raw); } catch (_) { return raw; }
      });
    var existing = form.querySelector('input[name="categoryFiltersSerialized"]');
    if (!existing) {
      existing = document.createElement('input');
      existing.type = 'hidden';
      existing.name = 'categoryFiltersSerialized';
      form.appendChild(existing);
    }
    existing.value = selectedFilters.join(',');

    var selectedSubCats = Array.prototype.slice.call(document.querySelectorAll('input[name="subCategoryIds"]:checked'))
      .map(function (el) { return String(el.value || '').trim(); })
      .filter(Boolean);
    var subSerialized = form.querySelector('input[name="subCategoriesSerialized"]');
    if (!subSerialized) {
      subSerialized = document.createElement('input');
      subSerialized.type = 'hidden';
      subSerialized.name = 'subCategoriesSerialized';
      form.appendChild(subSerialized);
    }
    subSerialized.value = selectedSubCats.join(',');
  });

  Array.prototype.slice.call(form.querySelectorAll('input,select,textarea')).forEach(function (el) {
    el.addEventListener('change', persistFormState);
    el.addEventListener('input', persistFormState);
  });

  if (window.location.search.indexOf('ok=') >= 0) {
    try { window.localStorage.removeItem(storageKey); } catch (_) {}
  }
})();
