# frozen_string_literal: true

class ChatReadBroadcastWorker
  include Sidekiq::Worker
  include Redisable

  def perform(conversation_id, user_id, last_read_at)
    account_id = User.find_by(id: user_id)&.account&.id&.to_s
    return unless account_id

    payload = {
      account_id: account_id,
      last_read_at: last_read_at,
    }

    redis.publish("chat:#{conversation_id}", { event: 'chat.read', payload: payload }.to_json)
  end
end