# frozen_string_literal: true

class Api::V1::UnansweredMentionsController < Api::BaseController
  DEFAULT_LIMIT = 20
  MAX_LIMIT = 40
  COUNT_LIMIT = 100

  before_action -> { doorkeeper_authorize! :read }, only: [:index, :count]
  before_action -> { doorkeeper_authorize! :write }, only: [:dismiss]
  before_action :require_user!

  # GET /api/v1/unanswered_mentions
  def index
    limit = params.fetch(:limit, DEFAULT_LIMIT).to_i.clamp(1, MAX_LIMIT)
    statuses = unanswered_scope.paginate_by_max_id(limit, params[:max_id], params[:since_id]).to_a

    if statuses.size == limit
      response.headers['Link'] = %(<#{api_v1_unanswered_mentions_url(limit: limit, max_id: statuses.last.id)}>; rel="next")
    end

    render json: statuses, each_serializer: REST::StatusSerializer
  end

  # GET /api/v1/unanswered_mentions/count
  def count
    render json: { count: unanswered_scope.reorder(nil).limit(COUNT_LIMIT).count }
  end

  # POST /api/v1/unanswered_mentions/:id/dismiss
  def dismiss
    MentionDismissal.record_if_mentioned!(current_account.id, params[:id].to_i)
    render json: {}
  end

  private

  # 나를 멘션했고(DM 제외), 내가 아직 답글/좋아요/북마크/처리 완료를 하지 않은 글
  def unanswered_scope
    me = current_account.id

    Status.joins(:mentions, :account)
          .merge(Account.without_suspended)
          .where(mentions: { account_id: me, silent: false })
          .where.not(account_id: me)
          .where.not(account_id: current_account.excluded_from_timeline_account_ids)
          .where.not(visibility: :direct)
          .where(reblog_of_id: nil)
          .where.not(id: MentionDismissal.where(account_id: me).select(:status_id))
          .where.not(id: Favourite.where(account_id: me).select(:status_id))
          .where.not(id: Bookmark.where(account_id: me).select(:status_id))
          .where.not(id: Status.where(account_id: me).where.not(in_reply_to_id: nil).reorder(nil).select(:in_reply_to_id))
  end
end