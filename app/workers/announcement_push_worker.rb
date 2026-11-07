# frozen_string_literal: true

# 공지가 게시될 때 푸시를 켜 둔 모든 기기에 웹 푸시를 보낸다.
class AnnouncementPushWorker
  include Sidekiq::Worker
  include ActionView::Helpers::TextHelper
  include ActionView::Helpers::SanitizeHelper

  sidekiq_options queue: 'push', retry: 3

  BODY_LENGTH = 140

  def perform(announcement_id)
    announcement = Announcement.find_by(id: announcement_id)
    return if announcement.nil? || !announcement.published?

    fields = build_fields(announcement)

    Web::PushSubscription.find_each do |subscription|
      next unless CustomWebPushSender.deliverable?(subscription)

      begin
        CustomWebPushSender.new(subscription).deliver(fields)
      rescue StandardError => e
        Rails.logger.warn { "AnnouncementPushWorker: 전송 실패 subscription=#{subscription.id} #{e.class}: #{e.message}" }
      end
    end
  end

  private

  def build_fields(announcement)
    text = HTMLEntities.new.decode(strip_tags(announcement.text.to_s)).squish

    {
      notification_id: "announcement-#{announcement.id}",
      notification_type: 'announcement',
      title: '공지',
      body: truncate(text, length: BODY_LENGTH, escape: false),
      url: '/home',
    }
  end
end