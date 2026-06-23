/* MARKETA Intelligence — Live Clock */
document.addEventListener('DOMContentLoaded', function() {
  var clockEl = document.querySelector('.topbar-clock');
  if (!clockEl) return;
  var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function update() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = days[now.getDay()] + ' ' + String(now.getDate()).padStart(2, '0') + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() + ' \u00B7 ' + h + ':' + m + ':' + s;
  }
  update();
  setInterval(update, 1000);
});