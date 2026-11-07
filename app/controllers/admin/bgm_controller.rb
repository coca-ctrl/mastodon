# frozen_string_literal: true

module Admin
  class BgmController < BaseController
    VIDEO_ID_PATTERN = /\A[A-Za-z0-9_-]{11}\z/
    YOUTUBE_HOSTS = %w(youtube.com www.youtube.com m.youtube.com music.youtube.com youtu.be www.youtu.be).freeze
    PATH_PREFIXES = %w(shorts embed live v).freeze

    def update
      authorize :settings, :update?

      url = params.dig(:bgm, :url).to_s.strip
      offset = [params.dig(:bgm, :offset).to_i, 0].max
      enabled = ActiveModel::Type::Boolean.new.cast(params.dig(:bgm, :enabled)) == true
      restart = ActiveModel::Type::Boolean.new.cast(params.dig(:bgm, :restart)) == true
      video_id = url.blank? ? '' : extract_video_id(url)

      if video_id.nil?
        redirect_to admin_settings_appearance_path, alert: '유튜브 링크를 확인해 주세요. (재생목록 링크는 사용할 수 없고, 영상 링크만 가능합니다)'
        return
      end

      changed = video_id != Setting.bgm_video_id.to_s || offset != Setting.bgm_offset.to_i

      Setting.bgm_url = url
      Setting.bgm_video_id = video_id
      Setting.bgm_offset = offset
      Setting.bgm_enabled = enabled
      Setting.bgm_started_at = (Time.now.utc.to_f * 1000).to_i if restart || changed || Setting.bgm_started_at.to_i.zero?

      redirect_to admin_settings_appearance_path, notice: t('generic.changes_saved_msg')
    end

    private

    def extract_video_id(raw)
      uri = Addressable::URI.parse(raw)
      return unless uri&.host && %w(http https).include?(uri.scheme)

      host = uri.host.downcase
      return unless YOUTUBE_HOSTS.include?(host)

      segments = uri.path.to_s.split('/').compact_blank
      candidate = if host.end_with?('youtu.be')
                    segments.first
                  elsif uri.path == '/watch'
                    uri.query_values&.fetch('v', nil)
                  elsif PATH_PREFIXES.include?(segments.first)
                    segments.second
                  end

      candidate if candidate.to_s.match?(VIDEO_ID_PATTERN)
    rescue Addressable::URI::InvalidURIError
      nil
    end
  end
end
