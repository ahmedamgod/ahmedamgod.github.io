import { getState, update } from '../store.js';
import { esc, relDay, dkey, fmtTime, pad } from '../util.js';
import { pageHead, empty } from '../ui.js';
import { icon } from '../art.js';
import { markRead } from '../sync.js';

export default {
  render() {
    const list = getState().notifications;
    const unread = list.some((n) => !n.read);
    return pageHead('الإشعارات', { actions: list.length ? `<button class="icon-btn soft" data-act="clear" aria-label="امسح الكل">${icon('trash')}</button>` : '' }) +
      (unread ? '<button class="link small" data-act="read">علّم الكل كمقروء</button>' : '') +
      (list.length ? `<div class="col gap mt-s">${list.map((n) => { const d = new Date(n.at); return `<a href="#/${esc(n.link || 'home')}" class="card notif ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <span class="n-dot"></span><div class="grow"><b>${n.kind === 'in' ? '📩 ' : n.kind === 'bc' ? '📢 ' : ''}${esc(n.title)}</b>${n.from ? `<small class="muted block">من: ${esc(n.from)}</small>` : ''}<p class="small pre">${esc(n.body)}</p><small class="muted">${relDay(dkey(d))} · ${fmtTime(pad(d.getHours()) + ':' + pad(d.getMinutes()))}</small></div></a>`; }).join('')}</div>`
        : empty('مفيش إشعارات دلوقتي. شغّل التذكيرات من الإعدادات عشان نفكرك بمواعيدك 🔔', '<a class="btn soft" href="#/profile/settings">الإعدادات</a>'));
  },
  mount(el) {
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'read') { getState().notifications.filter((n) => !n.read).forEach((n) => markRead(n.id)); update((s) => s.notifications.forEach((n) => (n.read = true))); }
      if (a === 'clear') update((s) => { s.dismissed = [...new Set([...(s.dismissed || []), ...s.notifications.filter((n) => n.kind).map((n) => n.id)])].slice(-300); s.notifications = []; });
      const n = e.target.closest('.notif')?.dataset.id;
      if (n) { markRead(n); update((s) => { const x = s.notifications.find((y) => y.id === n); if (x) x.read = true; }, { silent: true }); }
    });
  },
};
