# frozen_string_literal: true

# 아보카도 정산 연동용 읽기 전용 API. 전용 비밀 키(SETTLEMENT_API_KEY)로만 접근한다.
class Api::V1::SettlementController < Api::BaseController
  before_action :require_settlement_key!

  # GET /api/v1/settlement/post_counts?from=ISO8601&to=ISO8601
  # 구간은 from 이상, to 미만. 부스트와 삭제된 글, DM은 세지 않는다.
  def post_counts
    from = parse_time(params[:from])
    to = parse_time(params[:to])

    unless from && to && from < to
      render json: { error: 'from/to 형식이 올바르지 않습니다.' }, status: :unprocessable_entity
      return
    end

    counts = Status.where(account_id: Account.where(domain: nil).select(:id))
                   .where.not(account_id: excluded_account_ids)
                   .where(reblog_of_id: nil, visibility: [:public, :unlisted, :private])
                   .where(created_at: from...to)
                   .reorder(nil)
                   .group(:account_id)
                   .count

    usernames = Account.where(id: counts.keys).pluck(:id, :username).to_h

    render json: {
      from: from.iso8601,
      to: to.iso8601,
      counts: counts.map do |account_id, count|
        { account_id: account_id.to_s, username: usernames[account_id], count: count }
      end,
    }
  end

  # GET /api/v1/settlement/accounts?username=soygogi
  def accounts
    account = Account.find_local(params[:username].to_s)

    unless account
      render json: { error: '계정을 찾을 수 없습니다.' }, status: :not_found
      return
    end

    render json: {
      account_id: account.id.to_s,
      username: account.username,
      display_name: account.display_name.presence || account.username,
      excluded: excluded_account_ids.include?(account.id),
    }
  end

  private

  def require_settlement_key!
    expected = ENV.fetch('SETTLEMENT_API_KEY', '')
    given = request.headers['X-Settlement-Key'].to_s

    if expected.blank?
      render json: { error: '정산 API가 설정되지 않았습니다.' }, status: :service_unavailable
    elsif !ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(given), Digest::SHA256.hexdigest(expected))
      render json: { error: '인증에 실패했습니다.' }, status: :unauthorized
    end
  end

  # Administrator 또는 manage_npcs(story) 역할 계정은 정산 대상에서 제외
  def excluded_account_ids
    @excluded_account_ids ||= User.includes(:account, :role)
                                  .select { |user| user.can?(:administrator, :manage_npcs) }
                                  .map(&:account_id)
  end

  def parse_time(value)
    Time.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end
end