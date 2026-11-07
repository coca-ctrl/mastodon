# frozen_string_literal: true

# 새 채팅 메시지를 같은 대화의 다른 참가자들에게 웹 푸시로 보낸다.
class ChatPushWorker
  include Sidekiq::Worker
  include RoutingHelper
  include ActionView::Helpers::TextHelper

  sidekiq_options queue: 'push', retry: 3

  BODY_LENGTH = 140

  def perform(message_id)
    message = ChatMessage.find_by(id: message_id)
    return if message.nil? || message.deleted? || message.message_type != 'user'

    recipient_ids = ChatConversationParticipant.active
                                               .where(chat_conversation_id: message.chat_conversation_id)
                                               .where.not(user_id: message.sender_id)
                                               .pluck(:user_id)
    return if recipient_ids.empty?

    fields = build_fields(message)

    Web::PushSubscription.where(user_id: recipient_ids).find_each do |subscription|
      next unless CustomWebPushSender.deliverable?(subscription)

      begin
        CustomWebPushSender.new(subscription).deliver(fields)
      rescue StandardError => e
        Rails.logger.warn { "ChatPushWorker: 전송 실패 subscription=#{subscription.id} #{e.class}: #{e.message}" }
      end
    end
  end

  private

  def build_fields(message)
    conversation = message.chat_conversation
    account = message.sender&.account
    sender_name = account&.display_name.presence || account&.username || '알 수 없음'

    title = conversation.group && conversation.name.present? ? "#{conversation.name} · #{sender_name}" : sender_name
    body = message.content.to_s.strip.presence || '이미지를 보냈습니다.'

    {
      notification_id: "chat-#{message.id}",
      notification_type: 'chat',
      icon: account ? full_asset_url(account.avatar_static_url) : nil,
      title: title,
      body: truncate(body, length: BODY_LENGTH, escape: false),
      url: "/chat/#{conversation.id}",
    }
  end
end