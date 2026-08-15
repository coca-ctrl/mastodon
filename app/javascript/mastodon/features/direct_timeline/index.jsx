import PropTypes from 'prop-types';
import { useRef, useCallback, useEffect } from 'react';
import { openModal } from 'mastodon/actions/modal';
import { changeComposeVisibility } from 'mastodon/actions/compose_typed';

import ChatBubbleIcon from '@/material-icons/400-24px/chat_bubble.svg?react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { useDispatch } from 'react-redux';

import AlternateEmailIcon from '@/material-icons/400-24px/alternate_email.svg?react';
import { addColumn, removeColumn, moveColumn } from 'mastodon/actions/columns';
import { mountConversations, unmountConversations, expandConversations } from 'mastodon/actions/conversations';
import { connectDirectStream } from 'mastodon/actions/streaming';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';

import { ConversationsList } from './components/conversations_list';

const messages = defineMessages({
  title: { id: 'column.direct', defaultMessage: 'Private mentions' },
});

const DirectTimeline = ({ columnId, multiColumn }) => {
  const columnRef = useRef();
  const intl = useIntl();
  const dispatch = useDispatch();
  const pinned = !!columnId;

  const handlePin = useCallback(() => {
    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('DIRECT', {}));
    }
  }, [dispatch, columnId]);

  const handleMove = useCallback((dir) => {
    dispatch(moveColumn(columnId, dir));
  }, [dispatch, columnId]);

  const handleHeaderClick = useCallback(() => {
    columnRef.current.scrollTop();
  }, [columnRef]);

  useEffect(() => {
    dispatch(mountConversations());
    dispatch(expandConversations());

    const disconnect = dispatch(connectDirectStream());

    return () => {
      dispatch(unmountConversations());
      disconnect();
    };
  }, [dispatch]);

  const handleNewMessage = useCallback(() => {
    dispatch(changeComposeVisibility('direct'));
    dispatch(openModal({ modalType: 'COMPOSE', modalProps: {} }));
  }, [dispatch]);

  return (
    <Column bindToDocument={!multiColumn} ref={columnRef} label={intl.formatMessage(messages.title)}>
      <ColumnHeader
        icon='comment'
        iconComponent={ChatBubbleIcon}
        title={intl.formatMessage(messages.title)}
        onPin={handlePin}
        onMove={handleMove}
        onClick={handleHeaderClick}
        pinned={pinned}
        multiColumn={multiColumn}
        extraButton={
          <button type='button' className='column-header__button' onClick={handleNewMessage}>
            <FormattedMessage id='navigation_bar.compose' defaultMessage='새 메시지' />
          </button>
        }
      />

      <ConversationsList
        trackScroll={!pinned}
        scrollKey={`direct_timeline-${columnId}`}
        emptyMessage={<FormattedMessage id='empty_column.direct' defaultMessage="You don't have any private mentions yet. When you send or receive one, it will show up here." />}
        bindToDocument={!multiColumn}
        prepend={<div className='follow_requests-unlocked_explanation'><span><FormattedMessage id='compose_form.encryption_warning' defaultMessage='Posts on Mastodon are not end-to-end encrypted. Do not share any dangerous information over Mastodon.' /> <a href='https://docs.joinmastodon.org/user/posting/#private' rel='noreferrer' target='_blank'><FormattedMessage id='compose_form.direct_message_warning_learn_more' defaultMessage='Learn more' /></a></span></div>}
        alwaysPrepend
      />

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

DirectTimeline.propTypes = {
  columnId: PropTypes.string,
  multiColumn: PropTypes.bool,
};

export default DirectTimeline;
