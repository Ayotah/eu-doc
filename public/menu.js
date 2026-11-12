const menuButton = document.querySelector('.guide-menu-toggle');
const navigation = document.getElementById('primary-navigation');

menuButton.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isExpanded));
  navigation.classList.toggle('is-open', !isExpanded);
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a')) {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }
});

document.addEventListener('click', event => {
  if (!event.target.closest('.guide-menu')) {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    menuButton.focus();
  }
});
