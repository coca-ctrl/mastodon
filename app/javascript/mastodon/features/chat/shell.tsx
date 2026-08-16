import { useParams } from 'react-router-dom';
import { Column } from 'mastodon/components/column';
import { useBreakpoint } from 'mastodon/features/ui/hooks/useBreakpoint';
import { ChatListPane } from './components/chat_list_pane';
import { ChatConversationPane } from './components/chat_conversation_pane';
import { useEffect } from 'react';

const ChatShell: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const conversationId = id ? Number(id) : null;
  const isWide = !useBreakpoint('full');
  useEffect(() => {
    document.body.classList.add('chat-screen-active');

    if (!isWide && conversationId) {
        document.body.classList.add('chat-conversation-active');
    }

    return () => {
        document.body.classList.remove('chat-screen-active');
        document.body.classList.remove('chat-conversation-active');
    };
  }, [isWide, conversationId]);

  return (
    <Column label='채팅' className='column--chat'>
      <div className='chat-shell'>
        {(isWide || !conversationId) && (
          <div className='chat-shell__list'>
            <ChatListPane activeId={conversationId ?? undefined} />
          </div>
        )}

        {(isWide || conversationId) && (
          <div className='chat-shell__conversation'>
            {conversationId ? (
              <ChatConversationPane
                conversationId={conversationId}
                showBack={!isWide}
              />
            ) : (
              <div className='chat-shell__placeholder'>
                대화를 선택하세요
              </div>
            )}
          </div>
        )}
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChatShell;