import { useCallback, useEffect } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import { useAppDispatch } from '@/mastodon/store';
import {
  changeComposing,
  mountCompose,
  unmountCompose,
} from 'mastodon/actions/compose';
import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';

import { DialogModal } from './dialog_modal';

const messages = defineMessages({
  title: { id: 'compose_modal.title', defaultMessage: '새 게시물' },
});

export const ComposeModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const intl = useIntl();
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
    <DialogModal
      title={intl.formatMessage(messages.title)}
      onClose={onClose}
      wrapperClassName='compose-modal__content'
    >
      <div onFocus={handleFocus}>
        <ComposeFormContainer autoFocus />
      </div>
    </DialogModal>
  );
};