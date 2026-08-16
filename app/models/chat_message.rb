# frozen_string_literal: true

class ChatMessage < ApplicationRecord
  belongs_to :chat_conversation
  belongs_to :sender, class_name: 'User'
  has_one :media_attachment, dependent: :nullify
  has_many :chat_message_edits, dependent: :destroy

  validates :content, length: { maximum: 5000 }
  validate :content_or_media_present

  scope :visible, -> { where(deleted_at: nil) }

  def deleted?
    deleted_at.present?
  end

  # 수정 시 이전 내용을 이력에 남기고 갱신
  def edit_content!(new_content)
    return false if deleted?

    ChatMessageEdit.create!(
      chat_message: self,
      previous_content: content,
      edited_at: Time.current
    )

    update!(content: new_content, edited: true)
  end

  def soft_delete!
    update!(deleted_at: Time.current)
  end

  private

  def content_or_media_present
    errors.add(:base, '내용 또는 이미지가 필요합니다') if content.blank? && media_attachment.blank?
  end
end