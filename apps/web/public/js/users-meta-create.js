(function () {
  var form = document.getElementById('metaCreateForm');
  if (!form) return;

  var permsRaw = form.querySelector('input[name="permissionsRaw"]');
  var permsSerialized = document.getElementById('permissionsSerialized');
  if (permsRaw && permsSerialized) {
    var syncPerms = function () {
      var arr = String(permsRaw.value || '')
        .split(',')
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
      permsSerialized.value = JSON.stringify(arr);
    };
    syncPerms();
    permsRaw.addEventListener('input', syncPerms);
    form.addEventListener('submit', function () {
      syncPerms();
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'permissions[]';
      hidden.value = '';
      form.appendChild(hidden);
      try {
        var arr = JSON.parse(permsSerialized.value || '[]');
        if (Array.isArray(arr)) {
          arr.forEach(function (p) {
            var i = document.createElement('input');
            i.type = 'hidden';
            i.name = 'permissions[]';
            i.value = String(p);
            form.appendChild(i);
          });
        }
      } catch (_e) {}
    });
  }

  document.querySelectorAll('.js-library-picker').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = String(btn.getAttribute('data-target') || '');
      if (!target) return;
      var url = '/admin/library?picker=1&target=' + encodeURIComponent(target);
      window.open(url, 'wikigouvLibraryPicker', 'width=1200,height=800');
    });
  });

  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.type !== 'LIBRARY_FILE_SELECTED') return;
    var target = String(data.target || '');
    var key = String(data.key || '');
    if (!target) return;
    var input = document.getElementById(target);
    if (input) input.value = key;
  });
})();

