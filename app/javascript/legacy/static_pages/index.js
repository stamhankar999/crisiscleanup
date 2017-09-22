$(document).ready(() => {
  const letsgobtn = document.getElementById('lets-go-btn');

  if (letsgobtn) {
    letsgobtn.addEventListener('click', () => {
      const locationSelect = document.getElementById('location-select');
      if (locationSelect.value === '') { return; }
      window.location = locationSelect.value;
    });
  }
});
