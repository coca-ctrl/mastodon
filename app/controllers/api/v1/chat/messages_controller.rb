# frozen_string_literal: true

class Api::V1::Chat::MessagesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write }
  before_action :require_user!
  before_action :set_message

  # PATCH/PUT /api/v1/chat/messages/:id
  def update
    unless @message.sender_id == current_user.id
      render json: { error: '본인 메시지만 수정할 수 있습니다.' }, status: :forbidden
      return
    end

    if @message.deleted?
      render json: { error: '삭제된 메시지입니다.' }, status: :unprocessable_entity
      return
    end

    @message.edit_content!(params.require(:content))
    ChatMessageBroadcastWorker.perform_async(@message.chat_conversation_id, @message.id, 'chat.message.update')
    render json: serialize_message(@message)
  end

  # DELETE /api/v1/chat/messages/:id
  def destroy
    unless @message.sender_id == current_user.id
      render json: { error: '본인 메시지만 삭제할 수 있습니다.' }, status: :forbidden
      return
    end

    @message.soft_delete!
    ChatMessageBroadcastWorker.perform_async(@message.chat_conversation_id, @message.id, 'chat.message.update')
    render json: { success: true }
  end

  private

  def set_message
    @message = ChatMessage.find(params[:id])
  end

  def serialize_message(message)
    sender_account = message.sender&.account
    {
      id: message.id,
      conversation_id: message.chat_conversation_id,
      message_type: message.message_type,
      sender_id: message.sender_id,
      sender_account_id: sender_account&.id&.to_s,
      sender_username: sender_account&.username,
      sender_display_name: sender_account&.display_name.presence || sender_account&.username,
      sender_avatar: sender_account&.avatar&.url,
      content: message.deleted? ? nil : message.content,
      media_url: message.deleted? ? nil : message.media_attachment&.file&.url,
      deleted: message.deleted?,
      edited: message.edited,
      created_at: message.created_at,
    }
  end
end