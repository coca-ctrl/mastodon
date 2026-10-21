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

  TITLE_LENGTH = 30

  # 목록에 보여 줄 제목: 시작 게시물의 첫 줄에서 주사위/가위바위보 마커와 마크다운 기호를 뺀다.
  def display_title
    self.class.title_from(start_status&.text).presence || title
  end

  def self.title_from(raw)
    raw.to_s.lines.map(&:chomp).each do |line|
      next if line.match?(/\A[ \t]*-{3,}[ \t]*\z/)

      cleaned = clean_title_line(line)
      return cleaned.truncate(TITLE_LENGTH) if cleaned.present?
    end

    nil
  end

  def self.clean_title_line(line)
    text = line.to_s.gsub(RollMarker::PATTERN, '')
    text = text.sub(/\A\s*\#{1,3}[ \t]+/, '').sub(/\A\s*>[ \t]+/, '')
    text = text.sub(/\A\s*\|[<>]/, '').sub(/(?:<\||>\|)\s*\z/, '')
    text = text.gsub(/\*{1,3}|~~|\+\+|==/, '')
    text.squish
  end

  def self.currently_open
    open.order(started_at: :desc).first
  end
end