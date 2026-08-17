# frozen_string_literal: true

class Api::V1::BackgroundsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write }, only: [:create, :update, :destroy]
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_background, only: [:show, :update, :destroy]

  def index
    backgrounds = current_account.backgrounds.order(created_at: :asc)
    render json: backgrounds.map { |bg| serialize_background(bg) }
  end

  def show
    render json: serialize_background(@background)
  end

  def create
    background = current_account.backgrounds.build(name: params.require(:name))
    background.image = params.require(:image)
    background.save!
    render json: serialize_background(background), status: :created
  end

  def update
    @background.name = params[:name] if params[:name].present?
    @background.image = params[:image] if params[:image].present?
    @background.save!
    render json: serialize_background(@background)
  end

  def destroy
    @background.destroy!
    render json: { success: true }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_background
    @background = current_account.backgrounds.find(params[:id])
  end

  def serialize_background(background)
    {
      id: background.id,
      name: background.name,
      url: background.image.url(:original),
      thumb_url: background.image.url(:thumb),
    }
  end
end