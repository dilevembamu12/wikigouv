(function () {
  var root = document.querySelector('[data-meta-type]');
  if (!root) return;
  var type = String(root.getAttribute('data-meta-type') || '');
  var checkAll = document.getElementById('metaCheckAll');
  var rowChecks = Array.prototype.slice.call(document.querySelectorAll('.meta-check-row'));
  var bulkApplyBtn = document.getElementById('metaBulkApplyBtn');
  var bulkAction = document.getElementById('metaBulkAction');

  if (checkAll) {
    checkAll.addEventListener('change', function () {
      rowChecks.forEach(function (cb) {
        cb.checked = !!checkAll.checked;
      });
    });
  }

  document.querySelectorAll('.js-meta-delete-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (typeof window.Swal === 'undefined') {
        form.submit();
        return;
      }
      window.Swal.fire({
        icon: 'warning',
        title: 'Delete item?',
        text: 'This action cannot be undone.',
        showCancelButton: true,
        confirmButtonText: 'Delete'
      }).then(function (choice) {
        if (choice.isConfirmed) form.submit();
      });
    });
  });

  if (!bulkApplyBtn) return;
  bulkApplyBtn.addEventListener('click', function () {
    var action = bulkAction ? String(bulkAction.value || '') : '';
    if (action !== 'delete') {
      if (window.Swal) window.Swal.fire({ icon: 'info', title: 'Select a bulk action first' });
      return;
    }
    var selected = rowChecks.filter(function (cb) {
      return cb.checked;
    }).map(function (cb) {
      return cb.value;
    });

    if (!selected.length) {
      if (window.Swal) window.Swal.fire({ icon: 'info', title: 'No rows selected' });
      return;
    }

    var base = '';
    if (type === 'roles') base = '/api/admin/users/roles/';
    if (type === 'groups') base = '/api/admin/users/groups/';
    if (type === 'badges') base = '/api/admin/users/badges/';
    if (!base) return;

    var proceed = function () {
      Promise.all(selected.map(function (id) {
        return fetch(base + encodeURIComponent(id) + '/delete', { method: 'POST', credentials: 'include' });
      }))
        .then(function () {
          if (window.Swal) return window.Swal.fire({ icon: 'success', title: 'Deleted', timer: 900, showConfirmButton: false });
        })
        .finally(function () {
          window.location.reload();
        });
    };

    if (!window.Swal) {
      proceed();
      return;
    }
    window.Swal.fire({
      icon: 'warning',
      title: 'Bulk delete selected items?',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(function (choice) {
      if (choice.isConfirmed) proceed();
    });
  });
})();
