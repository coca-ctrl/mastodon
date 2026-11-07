# frozen_string_literal: true

# 알림(Notification) 레코드 없이 임의의 JSON을 웹 푸시로 보낸다. (채팅, 공지용)
# 전송 방식은 Web::PushNotificationWorker 와 동일하다.
class CustomWebPushSender
  include RoutingHelper

  TTL     = 48.hours
  URGENCY = 'normal'

  # 멘션 알림 스위치가 켜져 있고 정책이 'none' 이 아닌 구독만 대상으로 한다.
  def self.deliverable?(subscription)
    alerts = subscription.data&.dig('alerts')
    return false unless ActiveModel::Type::Boolean.new.cast(alerts&.dig('mention'))

    subscription.data&.dig('policy') != 'none'
  end

  def initialize(subscription)
    @subscription = subscription
  end

  def deliver(fields)
    unless @subscription.valid?
      @subscription.destroy!
      return
    end

    @json = base_payload.merge(fields).to_json

    if web_push_request.legacy
      deliver_legacy
    else
      deliver_standard
    end
  end

  private

  def base_payload
    {
      access_token: @subscription.associated_access_token,
      preferred_locale: @subscription.user&.locale || I18n.default_locale,
    }
  end

  def deliver_legacy
    payload = web_push_request.legacy_encrypt(@json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload.fetch(:ciphertext), http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aesgcm',
        'Encryption' => "salt=#{Webpush.encode64(payload.fetch(:salt)).delete('=')}",
        'Crypto-Key' => "dh=#{Webpush.encode64(payload.fetch(:server_public_key)).delete('=')};#{web_push_request.crypto_key_header}",
        'Authorization' => web_push_request.legacy_authorization_header,
        'Unsubscribe-URL' => subscription_url
      )

      post(request)
    end
  end

  def deliver_standard
    payload = web_push_request.standard_encrypt(@json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload, http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aes128gcm',
        'Authorization' => web_push_request.standard_authorization_header,
        'Unsubscribe-URL' => subscription_url,
        'Content-Length' => payload.length.to_s
      )

      post(request)
    end
  end

  def post(request)
    request.perform do |response|
      # 만료/무효 구독(408, 429 제외한 4xx)은 삭제한다.
      if (400..499).cover?(response.code) && ![408, 429].include?(response.code)
        @subscription.destroy!
      elsif !(200...300).cover?(response.code)
        raise Mastodon::UnexpectedResponseError, response
      end
    end
  end

  def web_push_request
    @web_push_request ||= WebPushRequest.new(@subscription)
  end

  def request_pool
    RequestPool.current
  end

  def subscription_url
    api_web_push_subscription_url(id: @subscription.generate_token_for(:unsubscribe))
  end
end