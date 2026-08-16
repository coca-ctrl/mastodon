# frozen_string_literal: true

class ChatConversation < ApplicationRecord
  belongs_to :owner, class_name: 'User', optional: true

  has_many :chat_conversation_participants, dependent: :destroy
  has_many :participants, through: :chat_conversation_participants, source: :user
  has_many :chat_messages, dependent: :destroy

  validates :group, inclusion: { in: [true, false] }

  # 1:1 대화는 이름이 없으므로, 상대방 계정을 프론트에서 표시
  def direct?
    !group
  end
end