# frozen_string_literal: true

# 관리자 전용: 모든 채팅방과 메시지를 읽기 전용으로 열람한다.
# 참여자용 경로와 완전히 분리되어 있어 읽음 처리(last_read_at)에 영향을 주지 않는다.
class Api::V1::Chat::AdminConversationsController < Api::BaseController
  CONVERSATIONS_PER_PAGE = 30
  MESSAGES_PER_PAGE = 50

  before_action -> { doorkeeper_authorize! :read }
  before_action :require_user!
  before_action :require_administrator!

  # GET /api/v1/chat/admin/conversations?q=&page=
  def index
    page = [params[:page].to_i, 1].max

    # 메시지가 하나도 없는 빈 대화방은 목록에서 제외
    scope = ChatConversation.where(id: ChatMessage.select(:chat_conversation_id))
    scope = apply_search(scope, params[:q].to_s.strip) if params[:q].present?

    conversations = scope.order(updated_at: :desc, id: :desc)
                         .offset((page - 1) * CONVERSATIONS_PER_PAGE)
                         .limit(CONVERSATIONS_PER_PAGE + 1)
                         .to_a

    has_more = conversations.size > CONVERSATIONS_PER_PAGE
    conversations = conversations.first(CONVERSATIONS_PER_PAGE)

    render json: { conversations: serialize_conversations(conversations), has_more: has_more }
  end

  # GET /api/v1/chat/admin/conversations/:id/messages?max_id=
  def messages
    conversation = ChatConversation.find(params[:id])

    scope = conversation.chat_messages.includes(:media_attachment, sender: :account).order(id: :desc)
    scope = scope.where('chat_messages.id < ?', params[:max_id].to_i) if params[:max_id].present?

    records = scope.limit(MESSAGES_PER_PAGE + 1).to_a
    has_more = records.size > MESSAGES_PER_PAGE
    records = records.first(MESSAGES_PER_PAGE).reverse

    render json: {
      conversation: serialize_conversations([conversation]).first,
      messages: records.map { |message| serialize_message(message) },
      has_more: has_more,
    }
  end

  private

  def require_administrator!
    render json: { error: '관리자만 접근할 수 있습니다.' }, status: :forbidden unless current_user&.can?(:administrator)
  end

  # 참여자 이름(아이디/표시 이름) 또는 그룹 이름으로 검색
  def apply_search(scope, query)
    term = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"

    matching_user_ids = User.joins(:account)
                            .where('accounts.username ILIKE :term OR accounts.display_name ILIKE :term', term: term)
                            .select(:id)
    by_participant = ChatConversationParticipant.where(user_id: matching_user_ids).select(:chat_conversation_id)

    scope.where(id: by_participant).or(scope.where('chat_conversations.name ILIKE ?', term))
  end

  def serialize_conversations(conversations)
    ids = conversations.map(&:id)

    participants = ChatConversationParticipant.where(chat_conversation_id: ids)
                                              .includes(user: :account)
                                              .group_by(&:chat_conversation_id)

    message_counts = ChatMessage.where(chat_conversation_id: ids, message_type: 'user')
                                .group(:chat_conversation_id)
                                .count

    last_messages = ChatMessage.where(chat_conversation_id: ids)
                               .select('DISTINCT ON (chat_messages.chat_conversation_id) chat_messages.*')
                               .order(Arel.sql('chat_messages.chat_conversation_id, chat_messages.id DESC'))
                               .includes(sender: :account)
                               .index_by(&:chat_conversation_id)

    conversations.map do |conversation|
      last_message = last_messages[conversation.id]

      {
        id: conversation.id,
        group: conversation.group,
        name: conversation.name,
        participants: (participants[conversation.id] || []).map { |participant| serialize_participant(participant) },
        message_count: message_counts[conversation.id] || 0,
        last_message: last_message && serialize_message(last_message),
        updated_at: conversation.updated_at,
      }
    end
  end

  def serialize_participant(participant)
    account = participant.user&.account

    {
      user_id: participant.user_id,
      account_id: account&.id&.to_s,
      username: account&.username,
      display_name: account&.display_name.presence || account&.username,
      avatar: account&.avatar&.url,
      left: participant.left_at.present?,
    }
  end

  # 관리자용: 삭제된 메시지도 원문을 그대로 내려주고 deleted 플래그로 구분한다
  def serialize_message(message)
    sender_account = message.sender&.account

    {
      id: message.id,
      message_type: message.message_type,
      sender_account_id: sender_account&.id&.to_s,
      sender_username: sender_account&.username,
      sender_display_name: sender_account&.display_name.presence || sender_account&.username,
      sender_avatar: sender_account&.avatar&.url,
      content: message.content,
      media_url: message.media_attachment&.file&.url,
      deleted: message.deleted?,
      deleted_at: message.deleted_at,
      edited: message.edited,
      created_at: message.created_at,
    }
  end
end