(function () {
  var form = document.getElementById('userForm');
  if (!form || typeof window.Swal === 'undefined') return;

  form.addEventListener('submit', function () {
    window.Swal.fire({
      icon: 'info',
      title: 'Saving...',
      timer: 700,
      showConfirmButton: false
    });
  });
})();

