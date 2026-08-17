# frozen_string_literal: true

class Api::V1::NpcsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write }, only: [:create, :update, :destroy]
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_npc, only: [:show, :update, :destroy]

  # GET /api/v1/npcs
  def index
    npcs = current_account.npcs.order(created_at: :asc)
    render json: npcs.map { |npc| serialize_npc(npc) }
  end

  # GET /api/v1/npcs/:id
  def show
    render json: serialize_npc(@npc)
  end

  # POST /api/v1/npcs
  def create
    npc = current_account.npcs.create!(name: params.require(:name))
    render json: serialize_npc(npc), status: :created
  end

  # PUT/PATCH /api/v1/npcs/:id
  def update
    @npc.update!(name: params.require(:name))
    render json: serialize_npc(@npc)
  end

  # DELETE /api/v1/npcs/:id
  def destroy
    @npc.destroy!
    render json: { success: true }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_npc
    @npc = current_account.npcs.find(params[:id])
  end

  def serialize_npc(npc)
    {
      id: npc.id,
      name: npc.name,
      images: npc.npc_images.map { |img| serialize_image(img) },
    }
  end

  def serialize_image(image)
    {
      id: image.id,
      emotion: image.emotion,
      url: image.image.url(:original),
      thumb_url: image.image.url(:thumb),
    }
  end
end