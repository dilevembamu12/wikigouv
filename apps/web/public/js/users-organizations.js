(function () {
  document.querySelectorAll('.js-delete-user-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (typeof window.Swal === 'undefined') {
        form.submit();
        return;
      }
      window.Swal.fire({
        icon: 'warning',
        title: 'Delete organization?',
        text: 'This action cannot be undone.',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      }).then(function (choice) {
        if (choice.isConfirmed) form.submit();
      });
    });
  });
})();

