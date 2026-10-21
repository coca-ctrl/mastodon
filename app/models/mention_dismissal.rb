# frozen_string_literal: true

# == Schema Information
#
# Table name: mention_dismissals
#
#  id         :bigint(8)        not null, primary key
#  created_at :datetime         not null
#  account_id :bigint(8)        not null
#  status_id  :bigint(8)        not null
#

# "답장할 멘션" 목록에서 치운 글 기록 (처리 완료, 좋아요, 북마크 시 생성)
class MentionDismissal < ApplicationRecord
  belongs_to :account
  belongs_to :status

  # 이미 있으면 무시한다
  def self.record!(account_id, status_id)
    insert({ account_id: account_id, status_id: status_id, created_at: Time.current }, unique_by: %i(account_id status_id))
  end

  # 해당 글이 이 계정을 멘션한 경우에만 기록한다
  def self.record_if_mentioned!(account_id, status_id)
    return unless Mention.exists?(account_id: account_id, status_id: status_id)

    record!(account_id, status_id)
  end
end