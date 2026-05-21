(() => {
  const toggles = document.querySelectorAll('#sidebar-wrapper .has-dropdown');
  if (!toggles.length) return;

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.preventDefault();

      const parent = toggle.closest('.nav-item.dropdown');
      if (!parent) return;

      const menu = parent.querySelector(':scope > .dropdown-menu');
      if (!menu) return;

      const isOpen = menu.style.display === 'block';

      // close sibling dropdowns for cleaner UX
      const siblingDropdowns = parent.parentElement?.querySelectorAll(':scope > .nav-item.dropdown');
      siblingDropdowns?.forEach((sibling) => {
        if (sibling === parent) return;
        const siblingToggle = sibling.querySelector(':scope > .has-dropdown');
        const siblingMenu = sibling.querySelector(':scope > .dropdown-menu');
        sibling.classList.remove('active');
        siblingToggle?.setAttribute('aria-expanded', 'false');
        if (siblingMenu) siblingMenu.style.display = 'none';
      });

      if (isOpen) {
        menu.style.display = 'none';
        parent.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        menu.style.display = 'block';
        parent.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
