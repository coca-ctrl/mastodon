# frozen_string_literal: true

class ChatMessageBroadcastWorker
  include Sidekiq::Worker
  include Redisable

  def perform(conversation_id, message_id, event = 'chat.message')
    message = ChatMessage.find_by(id: message_id)
    return unless message

    payload = {
      id: message.id,
      conversation_id: message.chat_conversation_id,
      message_type: message.message_type,
      sender_id: message.sender_id,
      sender_account_id: message.sender&.account&.id&.to_s,
      sender_username: message.sender&.account&.username,
      sender_display_name: message.sender&.account&.display_name.presence || message.sender&.account&.username,
      sender_avatar: message.sender&.account&.avatar&.url,
      content: message.deleted? ? nil : message.content,
      media_url: message.deleted? ? nil : message.media_attachment&.file&.url,
      deleted: message.deleted?,
      edited: message.edited,
      created_at: message.created_at,
    }

    redis.publish("chat:#{conversation_id}", { event: event, payload: payload }.to_json)
  rescue ActiveRecord::RecordNotFound
    true
  end
end