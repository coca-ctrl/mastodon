import type { ChatUser } from '../api';

export const GroupAvatar: React.FC<{
  participants: ChatUser[];
  size: 'list' | 'header';
}> = ({ participants, size }) => {
  const shown = participants.slice(0, 3);
  const extra = participants.length - shown.length;

  return (
    <div className={`group-avatar group-avatar--${size}`}>
      {shown.map((p, i) => (
        <img
          key={p.id}
          src={p.avatar}
          alt=''
          className='group-avatar__item'
          style={{ zIndex: shown.length - i }}
        />
      ))}
      {extra > 0 && <span className='group-avatar__badge'>+{extra}</span>}
    </div>
  );
};