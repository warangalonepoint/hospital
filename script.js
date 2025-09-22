function bookSubmit(e){
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  const date = f.date.value;
  const msg = encodeURIComponent(f.msg.value.trim());
  const text = encodeURIComponent(`Appointment request:\nName: ${name}\nPhone: ${phone}\nDate: ${date}\nNotes: ${f.msg.value.trim()}`);
  // WhatsApp click-to-chat
  window.location.href = `https://wa.me/919999999999?text=${text}`;
  return false;
}
