// Theme toggle
const toggle = document.getElementById('themeToggle');
if (toggle){
  toggle.addEventListener('click', ()=>{
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
  });
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}
// WhatsApp booking
function bookSubmit(e){
  e.preventDefault();
  const f = e.target;
  const text = encodeURIComponent(`Appointment request:\nName: ${f.name.value}\nPhone: ${f.phone.value}\nDate: ${f.date.value}\nNotes: ${f.msg.value}`);
  window.location.href = `https://wa.me/919999999999?text=${text}`;
  return false;
}
