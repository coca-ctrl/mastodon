# frozen_string_literal: true

class ChatConversationParticipant < ApplicationRecord
  belongs_to :chat_conversation
  belongs_to :user

  validates :user_id, uniqueness: { scope: :chat_conversation_id }

  scope :active, -> { where(left_at: nil) }

  def unread_count
    return 0 unless last_read_at

    chat_conversation.chat_messages.where('created_at > ?', last_read_at).count
  end
end