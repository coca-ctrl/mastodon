# frozen_string_literal: true

class StorySession < ApplicationRecord
  belongs_to :start_status, class_name: 'Status'
  belongs_to :end_status, class_name: 'Status', optional: true
  belongs_to :created_by_account, class_name: 'Account'

  has_attached_file :thumbnail,
                     styles: {
                       original: '600x600>',
                       thumb: '200>',
                     },
                     convert_options: { all: '-strip' }

  validates_attachment_content_type :thumbnail, content_type: %w(image/jpeg image/png image/webp)
  do_not_validate_attachment_file_type :thumbnail

  scope :open, -> { where(end_status_id: nil) }
  scope :closed, -> { where.not(end_status_id: nil) }

  def open?
    end_status_id.nil?
  end

  def close!(status)
    update!(end_status: status, ended_at: status.created_at)
  end

  def self.currently_open
    open.order(started_at: :desc).first
  end
end