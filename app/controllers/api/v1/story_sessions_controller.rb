# frozen_string_literal: true

class Api::V1::StorySessionsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }
  before_action :require_user!
  before_action :set_session, only: [:show]

  # GET /api/v1/story_sessions
  def index
    sessions = StorySession.order(started_at: :desc)
    render json: sessions.map { |s| serialize_session(s) }
  end

  # GET /api/v1/story_sessions/:id
  def show
    if @session.open?
      render json: { error: '아직 진행 중인 스토리입니다.' }, status: :unprocessable_entity
      return
    end

    statuses = eligible_statuses(@session)
    render json: {
      session: serialize_session(@session),
      statuses: statuses.map { |s| serialize_status(s) },
    }
  end

  private

  def set_session
    @session = StorySession.find(params[:id])
  end

  def eligible_statuses(session)
  permitted_account_ids = User.joins(:account)
                               .select { |u| u.can?(:manage_npcs) }
                               .map(&:account_id)

  Status.where(account_id: permitted_account_ids)
        .where('statuses.created_at >= ? AND statuses.created_at <= ?', session.started_at, session.ended_at)
        .where(visibility: [:public, :unlisted])
        .reorder(created_at: :asc)
  end

  def serialize_session(session)
    {
      id: session.id,
      title: session.title,
      thumbnail_url: session.thumbnail.url(:original),
      started_at: session.started_at,
      ended_at: session.ended_at,
      open: session.open?,
      post_count: session.open? ? nil : eligible_statuses(session).count,
    }
  end

  def serialize_status(status)
    ActiveModelSerializers::SerializableResource.new(
      status,
      serializer: REST::StatusSerializer,
      scope: current_user,
      scope_name: :current_user
    ).as_json
  end
end