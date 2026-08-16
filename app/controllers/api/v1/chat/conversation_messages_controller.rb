# frozen_string_literal: true

class Api::V1::Chat::ConversationMessagesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index]
  before_action -> { doorkeeper_authorize! :write }, only: [:create]
  before_action :require_user!
  before_action :set_conversation
  before_action :require_participant!

  # GET /api/v1/chat/conversations/:conversation_id/messages
  def index
    messages = @conversation.chat_messages
                             .order(created_at: :desc)
                             .limit(50)

    messages = messages.where('id < ?', params[:max_id]) if params[:max_id].present?

    render json: messages.reverse.map { |m| serialize_message(m) }
  end

  # POST /api/v1/chat/conversations/:conversation_id/messages
  def create
    media = nil

    if params[:media_id].present?
      media = current_account.media_attachments.where(status_id: nil, chat_message_id: nil).find_by(id: params[:media_id])
    end

    message = @conversation.chat_messages.new(
      sender: current_user,
      content: params[:content].presence || ''
    )

    if media
      message.media_attachment = media
    end

    message.save!

    @conversation.touch

    render json: serialize_message(message), status: :created
  end

  private

  def set_conversation
    @conversation = ChatConversation.find(params[:conversation_id])
  end

  def require_participant!
    participant = @conversation.chat_conversation_participants.find_by(user_id: current_user.id, left_at: nil)
    render json: { error: '참여자가 아닙니다.' }, status: :forbidden unless participant
  end

  def serialize_message(message)
    {
      id: message.id,
      conversation_id: message.chat_conversation_id,
      sender_id: message.sender_id,
      sender_account_id: message.sender.account&.id&.to_s,
      content: message.deleted? ? nil : message.content,
      media_url: message.deleted? ? nil : message.media_attachment&.file&.url,
      deleted: message.deleted?,
      edited: message.edited,
      created_at: message.created_at,
    }
  end
end