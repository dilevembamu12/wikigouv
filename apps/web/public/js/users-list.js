(function () {
  var deleteForms = document.querySelectorAll('.js-delete-user-form');
  if (!deleteForms.length || typeof window.Swal === 'undefined') return;

  deleteForms.forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      window.Swal.fire({
        icon: 'warning',
        title: 'Delete user?',
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

