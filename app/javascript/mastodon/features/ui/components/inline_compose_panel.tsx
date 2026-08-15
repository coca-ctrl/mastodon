import { useCallback, useEffect } from 'react';

import { useAppDispatch } from '@/mastodon/store';
import {
  changeComposing,
  mountCompose,
  unmountCompose,
} from 'mastodon/actions/compose';
import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';

export const InlineComposePanel: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleFocus = useCallback(() => {
    dispatch(changeComposing(true));
  }, [dispatch]);

  useEffect(() => {
    dispatch(mountCompose());
    return () => {
      dispatch(unmountCompose());
    };
  }, [dispatch]);

  return (
    <div className='inline-compose-panel' onFocus={handleFocus}>
      <ComposeFormContainer singleColumn />
    </div>
  );
};