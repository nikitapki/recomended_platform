import { Bell, CheckCheck, Inbox, X } from 'lucide-react';

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString('ru-RU') : 'Дата не указана';
}

function NotificationsPanel({ notifications, onClose, onOpen, onReadAll }) {
  return (
    <section className="notifications-panel" aria-label="Уведомления">
      <div className="notifications-panel-heading"><div><h2>Уведомления</h2><p>Последние импорты и экспорты</p></div><button className="icon-button" onClick={onClose} title="Закрыть"><X size={18} /></button></div>
      {notifications.length > 0 && <button className="notifications-read-all" onClick={onReadAll}><CheckCheck size={16} />Прочитать все</button>}
      {notifications.length === 0 ? <div className="notifications-empty"><Inbox size={28} /><strong>Уведомлений пока нет</strong><span>Здесь появятся результаты импорта и экспорта.</span></div> : <div className="notifications-list">{notifications.map((notification) => <button className={notification.read ? 'notification-item' : 'notification-item unread'} key={notification.id} onClick={() => onOpen(notification)}><Bell size={17} /><div><span>{notification.type}</span><strong>{notification.title}</strong><small>{notification.details} · {formatDate(notification.timestamp)}</small>{notification.status && <em>{notification.status}</em>}</div></button>)}</div>}
    </section>
  );
}

export default NotificationsPanel;
