# frozen_string_literal: true

require 'open3'

# 스토리 계정이 등록하는 짧은 효과음. 카드/NPC 게시물에 연결해 쓴다.
class StorySound < ApplicationRecord
  MAX_PER_ACCOUNT = 30
  MAX_SIZE = 2.megabytes
  MAX_DURATION = 10.0
  DURATION_TOLERANCE = 0.3

  MIME_TYPES = {
    'mp3' => 'audio/mpeg',
    'ogg' => 'audio/ogg',
    'm4a' => 'audio/mp4',
    'wav' => 'audio/wav',
  }.freeze

  belongs_to :account

  has_attached_file :file
  do_not_validate_attachment_file_type :file

  validates_attachment_presence :file
  validates_attachment_size :file, less_than: MAX_SIZE
  validates :name, presence: true, length: { maximum: 30 }

  validate :audio_file_valid
  validate :within_account_limit, on: :create

  private

  # 클라이언트가 알려 준 형식은 믿지 않고 ffprobe 로 실제 내용을 확인한다.
  # 저장 파일명도 확인된 형식의 확장자로 새로 만든다.
  def audio_file_valid
    upload = file.queued_for_write[:original]
    return if upload.nil? || upload.size > MAX_SIZE

    info = probe(upload.path)

    if info.nil?
      errors.add(:base, '오디오 파일을 읽을 수 없습니다.')
      return
    end

    extension = extension_for(info)

    if extension.nil?
      errors.add(:base, 'mp3, ogg, m4a, wav 파일만 사용할 수 있습니다.')
      return
    end

    duration = info.dig('format', 'duration').to_f

    if duration <= 0 || duration > MAX_DURATION + DURATION_TOLERANCE
      errors.add(:base, "효과음은 #{MAX_DURATION.to_i}초 이하만 사용할 수 있습니다.")
      return
    end

    self.duration_ms = (duration * 1000).round
    file.instance_write(:file_name, "#{SecureRandom.hex(8)}.#{extension}")
    file.instance_write(:content_type, MIME_TYPES.fetch(extension))
  end

  def probe(path)
    output, _error, status = Open3.capture3(
      'ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path
    )
    return unless status.success?

    JSON.parse(output)
  rescue JSON::ParserError, SystemCallError
    nil
  end

  def extension_for(info)
    streams = info['streams'] || []
    return unless streams.any? { |stream| stream['codec_type'] == 'audio' }
    return if streams.any? { |stream| stream['codec_type'] == 'video' && stream.dig('disposition', 'attached_pic') != 1 }

    names = info.dig('format', 'format_name').to_s.split(',')

    if names.include?('mp3')
      'mp3'
    elsif names.include?('ogg')
      'ogg'
    elsif names.include?('wav')
      'wav'
    elsif names.intersect?(%w(mp4 m4a mov))
      'm4a'
    end
  end

  def within_account_limit
    return if account_id.blank?

    errors.add(:base, "효과음은 계정당 최대 #{MAX_PER_ACCOUNT}개까지 등록할 수 있습니다.") if StorySound.where(account_id: account_id).count >= MAX_PER_ACCOUNT
  end
end
