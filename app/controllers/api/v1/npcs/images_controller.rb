# frozen_string_literal: true

class Api::V1::Npcs::ImagesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write }
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_npc
  before_action :set_image, only: [:update, :destroy]

  # POST /api/v1/npcs/:npc_id/npc_images
  def create
    image = @npc.npc_images.build(emotion: params.require(:emotion))
    image.image = params.require(:image)
    image.save!
    render json: serialize_image(image), status: :created
  end

  # PUT/PATCH /api/v1/npcs/:npc_id/npc_images/:id
  def update
    @image.image = params[:image] if params[:image].present?
    @image.emotion = params[:emotion] if params[:emotion].present?
    @image.save!
    render json: serialize_image(@image)
  end

  # DELETE /api/v1/npcs/:npc_id/npc_images/:id
  def destroy
    @image.destroy!
    render json: { success: true }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_npc
    @npc = current_account.npcs.find(params[:npc_id])
  end

  def set_image
    @image = @npc.npc_images.find(params[:id])
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