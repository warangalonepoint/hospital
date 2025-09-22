// Theme toggle
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
if (toggle){
  toggle.addEventListener('click', ()=>{
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}

// WhatsApp booking
function bookSubmit(e){
  e.preventDefault();
  const f = e.target;
  const name = encodeURIComponent(f.name.value.trim());
  const phone = encodeURIComponent(f.phone.value.trim());
  const date = encodeURIComponent(f.date.value);
  const notes = encodeURIComponent(f.msg.value.trim());
  const text = `Appointment request%0AName: ${name}%0APhone: ${phone}%0ADate: ${date}%0ANotes: ${notes}`;
  window.location.href = `https://wa.me/919999999999?text=${text}`;
  return false;
}
