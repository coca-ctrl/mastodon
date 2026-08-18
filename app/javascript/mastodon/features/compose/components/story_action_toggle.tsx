import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { changeComposeStoryAction } from 'mastodon/actions/compose';
import { isAdministrator } from 'mastodon/permissions';
import { useIdentity } from 'mastodon/identity_context';
import { apiRequestGet } from 'mastodon/api';

interface StoryStatus {
  open: boolean;
}

export const StoryActionToggle: React.FC = () => {
  const dispatch = useDispatch();
  const { permissions } = useIdentity();
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    apiRequestGet<StoryStatus[]>('v1/story_sessions')
      .then((sessions) => {
        setIsOpen(sessions.some((s) => s.open));
      })
      .catch(() => undefined);
  }, []);

  if (!isAdministrator(permissions)) return null;

  const handleToggle = (action: 'start' | 'end') => {
    const next = selected === action ? null : action;
    setSelected(next);
    dispatch(changeComposeStoryAction(next));
  };

  return (
    <div className='story-action-toggle'>
      <button
        type='button'
        className={selected === 'start' ? 'story-action-toggle--active' : ''}
        onClick={() => {
          handleToggle('start');
        }}
        disabled={isOpen === true}
      >
        스토리 시작
      </button>
      <button
        type='button'
        className={selected === 'end' ? 'story-action-toggle--active' : ''}
        onClick={() => {
          handleToggle('end');
        }}
        disabled={isOpen === false}
      >
        스토리 종료
      </button>
    </div>
  );
};